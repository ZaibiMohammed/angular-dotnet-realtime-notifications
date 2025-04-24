import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder, LogLevel, HttpTransportType } from '@microsoft/signalr';
import { NgEventBus } from 'ng-event-bus';
import { Notification } from '../models/notification.model';
import { environment } from '../../environments/environment';
import { BehaviorSubject } from 'rxjs';

/**
 * Events published by the SignalR service through NgEventBus
 */
export enum SignalREvent {
  NOTIFICATION_RECEIVED = 'notification.received',
  NOTIFICATION_UPDATED = 'notification.updated',
  NOTIFICATION_DELETED = 'notification.deleted',
  NOTIFICATIONS_UPDATED = 'notifications.updated',
  CONNECTION_STATE_CHANGED = 'connection.stateChanged'
}

/**
 * Service for managing SignalR connections and handling real-time notifications
 */
@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private hubConnection?: HubConnection;
  private connectionId: string | null = null;
  private readonly connectionUrl = environment.hubUrl;
  
  // Observable for connection state (connected/disconnected)
  private connectionStateSource = new BehaviorSubject<boolean>(false);
  connectionState$ = this.connectionStateSource.asObservable();
  
  // Track attempted reconnections
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private reconnectInterval = 2000; // Starting interval in ms

  constructor(private eventBus: NgEventBus) {}

  /**
   * Initialize and start the SignalR connection
   */
  public async startConnection(): Promise<void> {
    if (this.hubConnection) {
      return;
    }

    // Create the connection
    console.log('Creating SignalR connection to:', this.connectionUrl);
    this.hubConnection = new HubConnectionBuilder()
      .withUrl(this.connectionUrl, {
        // Add skipNegotiation and transport options to help with connection issues
        skipNegotiation: true,
        transport: HttpTransportType.WebSockets
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: retryContext => {
          // Implement exponential backoff for reconnection attempts
          if (retryContext.previousRetryCount < this.maxReconnectAttempts) {
            // Calculate delay with exponential backoff and some randomization
            const delay = Math.min(
              Math.pow(2, retryContext.previousRetryCount) * this.reconnectInterval + Math.random() * 1000,
              30000
            ); // Max 30 seconds
            
            console.log(`Reconnecting: Attempt ${retryContext.previousRetryCount + 1} in ${delay}ms`);
            return delay;
          }
          
          // Stop trying after max attempts
          return null;
        }
      })
      .configureLogging(LogLevel.Information)
      .build();

    // Connection handlers
    this.hubConnection.onreconnecting(error => {
      console.warn('Connection lost. Attempting to reconnect...', error);
      this.connectionStateSource.next(false);
      this.eventBus.cast(SignalREvent.CONNECTION_STATE_CHANGED, { connected: false, reconnecting: true });
    });

    this.hubConnection.onreconnected((connectionId: string | undefined) => {
      console.log('Connection reestablished. Connected with ID:', connectionId);
      this.connectionId = connectionId || null;
      this.connectionStateSource.next(true);
      this.reconnectAttempts = 0;
      this.eventBus.cast(SignalREvent.CONNECTION_STATE_CHANGED, { connected: true, reconnecting: false });
    });

    this.hubConnection.onclose(error => {
      console.error('Connection closed', error);
      this.connectionStateSource.next(false);
      this.connectionId = null;
      this.eventBus.cast(SignalREvent.CONNECTION_STATE_CHANGED, { connected: false, reconnecting: false });
      
      // Try to restart if we didn't exceed max attempts and wasn't closed intentionally
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        setTimeout(() => this.startConnection(), this.reconnectInterval);
      }
    });

    try {
      // Start the connection
      console.log('Attempting to connect to SignalR hub at:', this.connectionUrl);
      await this.hubConnection.start();
      console.log('SignalR connection established successfully');
      this.connectionStateSource.next(true);
      this.reconnectAttempts = 0;
      
      // Reset reconnect interval after successful connection
      this.reconnectInterval = 2000;
      
      // Register message handlers after connection is established
      this.registerSignalRHandlers();
      
    } catch (error) {
      console.error('Error establishing SignalR connection:', error);
      console.error('Connection URL:', this.connectionUrl);
      console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      this.connectionStateSource.next(false);
      
      // Try to reconnect with exponential backoff
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const timeout = Math.min(
          Math.pow(2, this.reconnectAttempts) * this.reconnectInterval + Math.random() * 1000,
          30000
        );
        
        console.log(`Connection failed. Retrying in ${timeout}ms (Attempt ${this.reconnectAttempts})`);
        setTimeout(() => this.startConnection(), timeout);
      }
    }
  }

  /**
   * Register the SignalR message handlers
   */
  private registerSignalRHandlers(): void {
    if (!this.hubConnection) {
      console.error('Cannot register handlers: no active connection');
      return;
    }

    // Received connection ID on initial connection
    this.hubConnection.on('ConnectionEstablished', (connectionId: string) => {
      console.log('Connected with ID:', connectionId);
      this.connectionId = connectionId;
      this.eventBus.cast(SignalREvent.CONNECTION_STATE_CHANGED, { connected: true, connectionId });
    });

    // Handle incoming notifications
    this.hubConnection.on('ReceiveNotification', (notification: Notification) => {
      console.log('Notification received:', notification);
      
      // Convert timestamp string to Date object if needed
      if (typeof notification.timestamp === 'string') {
        notification.timestamp = new Date(notification.timestamp);
      }
      
      // Publish the notification to the event bus
      this.eventBus.cast(SignalREvent.NOTIFICATION_RECEIVED, notification);
    });

    // Handle notification updates
    this.hubConnection.on('NotificationUpdated', (notification: Notification) => {
      console.log('Notification updated:', notification);
      
      // Convert timestamp string to Date object if needed
      if (typeof notification.timestamp === 'string') {
        notification.timestamp = new Date(notification.timestamp);
      }
      
      // Publish the updated notification to the event bus
      this.eventBus.cast(SignalREvent.NOTIFICATION_UPDATED, notification);
    });

    // Handle bulk notification updates
    this.hubConnection.on('NotificationsUpdated', (notifications: Notification[]) => {
      console.log('Notifications bulk updated:', notifications);
      
      // Convert timestamp strings to Date objects if needed
      notifications.forEach(notification => {
        if (typeof notification.timestamp === 'string') {
          notification.timestamp = new Date(notification.timestamp);
        }
      });
      
      // Publish the updated notifications to the event bus
      this.eventBus.cast(SignalREvent.NOTIFICATIONS_UPDATED, notifications);
    });

    // Handle notification deletion
    this.hubConnection.on('NotificationDeleted', (notificationId: string) => {
      console.log('Notification deleted:', notificationId);
      
      // Publish the deleted notification ID to the event bus
      this.eventBus.cast(SignalREvent.NOTIFICATION_DELETED, notificationId);
    });

    // Handle group join confirmations
    this.hubConnection.on('JoinedGroup', (groupName: string) => {
      console.log('Joined notification group:', groupName);
    });

    // Handle group leave confirmations
    this.hubConnection.on('LeftGroup', (groupName: string) => {
      console.log('Left notification group:', groupName);
    });

    // Handle notification acknowledgements
    this.hubConnection.on('NotificationAcknowledged', (notificationId: string, connectionId: string) => {
      console.log(`Notification ${notificationId} acknowledged by connection ${connectionId}`);
    });
  }

  /**
   * Acknowledge receipt of a notification
   * @param notificationId The ID of the notification to acknowledge
   */
  public async acknowledgeNotification(notificationId: string): Promise<void> {
    if (!this.hubConnection) {
      throw new Error('No active SignalR connection');
    }

    try {
      await this.hubConnection.invoke('AcknowledgeNotification', notificationId);
      console.log('Notification acknowledged:', notificationId);
    } catch (error) {
      console.error('Error acknowledging notification:', error);
      throw error;
    }
  }

  /**
   * Join a notification group
   * @param groupName The name of the group to join
   */
  public async joinGroup(groupName: string): Promise<void> {
    if (!this.hubConnection) {
      throw new Error('No active SignalR connection');
    }

    try {
      await this.hubConnection.invoke('JoinGroup', groupName);
      console.log('Joined group:', groupName);
    } catch (error) {
      console.error('Error joining group:', error);
      throw error;
    }
  }

  /**
   * Leave a notification group
   * @param groupName The name of the group to leave
   */
  public async leaveGroup(groupName: string): Promise<void> {
    if (!this.hubConnection) {
      throw new Error('No active SignalR connection');
    }

    try {
      await this.hubConnection.invoke('LeaveGroup', groupName);
      console.log('Left group:', groupName);
    } catch (error) {
      console.error('Error leaving group:', error);
      throw error;
    }
  }

  /**
   * Stop the SignalR connection
   */
  public async stopConnection(): Promise<void> {
    if (this.hubConnection) {
      try {
        await this.hubConnection.stop();
        console.log('SignalR connection stopped');
        this.connectionStateSource.next(false);
        this.connectionId = null;
        this.hubConnection = undefined;
      } catch (error) {
        console.error('Error stopping SignalR connection:', error);
        throw error;
      }
    }
  }

  /**
   * Check if the connection is active
   */
  public isConnected(): boolean {
    return !!this.hubConnection && this.hubConnection.state === 'Connected';
  }

  /**
   * Get the current connection ID
   */
  public getConnectionId(): string | null {
    return this.connectionId;
  }
}
