import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { NgEventBus } from 'ng-event-bus';
import { Notification, NotificationType } from '../models/notification.model';
import { environment } from '../../environments/environment';
import { SignalREvent, SignalRService } from './signalr.service';

/**
 * Events published by the notification service through NgEventBus
 */
export enum NotificationEvent {
  NOTIFICATION_ADDED = 'notification.added',
  NOTIFICATION_UPDATED = 'notification.updated',
  NOTIFICATION_DELETED = 'notification.deleted',
  NOTIFICATIONS_UPDATED = 'notifications.updated',
  NOTIFICATIONS_LOADED = 'notifications.loaded'
}

/**
 * Service for managing notifications
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly apiUrl = `${environment.apiUrl}/notifications`;
  
  /**
   * Get the API URL for debugging purposes
   */
  public getApiUrl(): string {
    return this.apiUrl;
  }
  
  // Store notifications in memory
  private notificationsSource = new BehaviorSubject<Notification[]>([]);
  notifications$ = this.notificationsSource.asObservable();
  
  // Count of unread notifications
  private unreadCountSource = new BehaviorSubject<number>(0);
  unreadCount$ = this.unreadCountSource.asObservable();

  constructor(
    private http: HttpClient,
    private eventBus: NgEventBus,
    private signalRService: SignalRService
  ) {
    // Subscribe to real-time notification events from SignalR
    this.setupSignalRListeners();
  }

  /**
   * Initialize the service by connecting to SignalR and loading notifications
   */
  public async initialize(userId?: string): Promise<void> {
    console.log('Initializing notification service for user:', userId);
    
    try {
      // Start SignalR connection
      console.log('Starting SignalR connection...');
      await this.signalRService.startConnection();
      console.log('SignalR connection started successfully');
      
      // Load initial notifications
      console.log('Loading initial notifications...');
      if (userId) {
        console.log(`Getting notifications for user: ${userId}`);
        this.getUserNotifications(userId).subscribe(
          notifications => console.log(`Loaded ${notifications.length} notifications for user`),
          error => console.error('Error loading user notifications:', error)
        );
      } else {
        console.log('Getting all notifications');
        this.getAllNotifications().subscribe(
          notifications => console.log(`Loaded ${notifications.length} notifications`),
          error => console.error('Error loading all notifications:', error)
        );
      }
    } catch (error) {
      console.error('Error during notification service initialization:', error);
      throw error;
    }
  }

  /**
   * Setup listeners for SignalR events
   */
  private setupSignalRListeners(): void {
    // Handle new notifications
    this.eventBus.on(SignalREvent.NOTIFICATION_RECEIVED).subscribe(
      (notification: any) => {
        this.addNotificationToLocalStore(notification.data);
      }
    );

    // Handle updated notifications
    this.eventBus.on(SignalREvent.NOTIFICATION_UPDATED).subscribe(
      (notification: any) => {
        this.updateNotificationInLocalStore(notification.data);
      }
    );

    // Handle deleted notifications
    this.eventBus.on(SignalREvent.NOTIFICATION_DELETED).subscribe(
      (notificationId: any) => {
        this.removeNotificationFromLocalStore(notificationId.data);
      }
    );

    // Handle bulk updates (e.g., mark all as read)
    this.eventBus.on(SignalREvent.NOTIFICATIONS_UPDATED).subscribe(
      (notifications: any) => {
        this.updateMultipleNotificationsInLocalStore(notifications.data);
      }
    );
  }

  /**
   * Get all notifications
   */
  public getAllNotifications(): Observable<Notification[]> {
    console.log('Fetching all notifications from:', this.apiUrl);
    return this.http.get<Notification[]>(this.apiUrl)
      .pipe(
        map(notifications => {
          console.log('Received notifications from API:', notifications);
          return this.processNotifications(notifications);
        }),
        tap(notifications => {
          console.log('Processed notifications:', notifications);
          this.notificationsSource.next(notifications);
          this.updateUnreadCount();
          this.eventBus.cast(NotificationEvent.NOTIFICATIONS_LOADED, notifications);
        }),
        catchError((error: any) => {
          console.error('Error fetching notifications:', error);
          console.error('API URL:', this.apiUrl);
          console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
          return throwError(() => error);
        })
      );
  }

  /**
   * Get notifications for a specific user
   */
  public getUserNotifications(userId: string): Observable<Notification[]> {
    console.log(`Fetching notifications for user ${userId} from: ${this.apiUrl}/user/${userId}`);
    return this.http.get<Notification[]>(`${this.apiUrl}/user/${userId}`)
      .pipe(
        map(notifications => {
          console.log(`Received ${notifications.length} notifications for user ${userId}:`, notifications);
          return this.processNotifications(notifications);
        }),
        tap(notifications => {
          console.log(`Processed ${notifications.length} notifications for user ${userId}`);
          this.notificationsSource.next(notifications);
          this.updateUnreadCount();
          this.eventBus.cast(NotificationEvent.NOTIFICATIONS_LOADED, notifications);
        }),
        catchError((error: any) => {
          console.error(`Error fetching notifications for user ${userId}:`, error);
          console.error('API URL:', `${this.apiUrl}/user/${userId}`);
          console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
          return throwError(() => error);
        })
      );
  }

  /**
   * Send a new notification
   */
  public sendNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>): Observable<Notification> {
    console.log('Sending notification:', notification);
    return this.http.post<Notification>(this.apiUrl, notification)
      .pipe(
        map(newNotification => {
          console.log('Notification created successfully:', newNotification);
          return this.processNotification(newNotification);
        }),
        tap(newNotification => {
          console.log('Broadcasting notification added event');
          // We don't add it to the local store here because it will come via SignalR
          this.eventBus.cast(NotificationEvent.NOTIFICATION_ADDED, newNotification);
        }),
        catchError((error: any) => {
          console.error('Error sending notification:', error);
          console.error('Notification data:', notification);
          console.error('API URL:', this.apiUrl);
          console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
          return throwError(() => error);
        })
      );
  }

  /**
   * Send a test notification
   */
  public sendTestNotification(): Observable<Notification> {
    return this.http.post<Notification>(`${this.apiUrl}/test`, {})
      .pipe(
        map(notification => this.processNotification(notification))
      );
  }

  /**
   * Mark a notification as read
   */
  public markAsRead(notificationId: string): Observable<any> {
    console.log(`Marking notification as read: ${notificationId}`);
    return this.http.put(`${this.apiUrl}/${notificationId}/read`, {})
      .pipe(
        tap(() => {
          console.log(`Notification ${notificationId} marked as read successfully`);
          // Update the local notification
          const current = this.notificationsSource.value;
          const index = current.findIndex(n => n.id === notificationId);
          
          if (index !== -1) {
            console.log(`Updating local notification ${notificationId} to read state`);
            const updatedNotification = { ...current[index], isRead: true };
            this.updateNotificationInLocalStore(updatedNotification);
          } else {
            console.warn(`Notification ${notificationId} not found in local store`);
          }
        }),
        catchError((error: any) => {
          console.error(`Error marking notification ${notificationId} as read:`, error);
          console.error('API URL:', `${this.apiUrl}/${notificationId}/read`);
          console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
          return throwError(() => error);
        })
      );
  }

  /**
   * Mark all notifications as read for a user
   */
  public markAllAsRead(userId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/user/${userId}/read-all`, {})
      .pipe(
        tap(() => {
          // Update all notifications in the local store
          const current = this.notificationsSource.value;
          const updated = current.map(n => ({...n, isRead: true}));
          this.notificationsSource.next(updated);
          this.updateUnreadCount();
          this.eventBus.cast(NotificationEvent.NOTIFICATIONS_UPDATED, updated);
        })
      );
  }

  /**
   * Delete a notification
   */
  public deleteNotification(notificationId: string): Observable<any> {
    console.log(`Deleting notification: ${notificationId}`);
    return this.http.delete(`${this.apiUrl}/${notificationId}`)
      .pipe(
        tap(() => {
          console.log(`Notification ${notificationId} deleted successfully`);
          // Remove from local store - will also be handled by SignalR, but we do it here for quick UI response
          this.removeNotificationFromLocalStore(notificationId);
        }),
        catchError((error: any) => {
          console.error(`Error deleting notification ${notificationId}:`, error);
          console.error('API URL:', `${this.apiUrl}/${notificationId}`);
          console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
          return throwError(() => error);
        })
      );
  }

  /**
   * Process a list of notifications from the API
   */
  private processNotifications(notifications: any[]): Notification[] {
    return notifications.map(n => this.processNotification(n));
  }

  /**
   * Process a single notification from the API
   */
  private processNotification(notification: any): Notification {
    // Convert timestamp to Date object if it's a string
    if (typeof notification.timestamp === 'string') {
      notification.timestamp = new Date(notification.timestamp);
    }
    
    return notification as Notification;
  }

  /**
   * Add a notification to the local store
   */
  private addNotificationToLocalStore(notification: Notification): void {
    const current = this.notificationsSource.value;
    
    // Check if notification already exists
    if (!current.some(n => n.id === notification.id)) {
      // Add the new notification at the beginning of the array
      const updated = [notification, ...current];
      this.notificationsSource.next(updated);
      this.updateUnreadCount();
      this.eventBus.cast(NotificationEvent.NOTIFICATION_ADDED, notification);
    }
  }

  /**
   * Update a notification in the local store
   */
  private updateNotificationInLocalStore(notification: Notification): void {
    const current = this.notificationsSource.value;
    const index = current.findIndex(n => n.id === notification.id);
    
    if (index !== -1) {
      const updated = [...current];
      updated[index] = notification;
      this.notificationsSource.next(updated);
      this.updateUnreadCount();
      this.eventBus.cast(NotificationEvent.NOTIFICATION_UPDATED, notification);
    }
  }

  /**
   * Remove a notification from the local store
   */
  private removeNotificationFromLocalStore(notificationId: string): void {
    const current = this.notificationsSource.value;
    const updated = current.filter(n => n.id !== notificationId);
    
    this.notificationsSource.next(updated);
    this.updateUnreadCount();
    this.eventBus.cast(NotificationEvent.NOTIFICATION_DELETED, notificationId);
  }

  /**
   * Update multiple notifications in the local store
   */
  private updateMultipleNotificationsInLocalStore(notifications: Notification[]): void {
    const current = this.notificationsSource.value;
    const updated = [...current];
    
    // Update each notification
    notifications.forEach(notification => {
      const index = updated.findIndex(n => n.id === notification.id);
      if (index !== -1) {
        updated[index] = notification;
      }
    });
    
    this.notificationsSource.next(updated);
    this.updateUnreadCount();
    this.eventBus.cast(NotificationEvent.NOTIFICATIONS_UPDATED, updated);
  }

  /**
   * Update the unread count
   */
  private updateUnreadCount(): void {
    const count = this.notificationsSource.value.filter(n => !n.isRead).length;
    this.unreadCountSource.next(count);
  }
}
