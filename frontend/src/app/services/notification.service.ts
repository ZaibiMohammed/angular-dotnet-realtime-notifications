import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
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
    // Start SignalR connection
    await this.signalRService.startConnection();
    
    // Load initial notifications
    if (userId) {
      this.getUserNotifications(userId).subscribe();
    } else {
      this.getAllNotifications().subscribe();
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
    return this.http.get<Notification[]>(this.apiUrl)
      .pipe(
        map(notifications => this.processNotifications(notifications)),
        tap(notifications => {
          this.notificationsSource.next(notifications);
          this.updateUnreadCount();
          this.eventBus.cast(NotificationEvent.NOTIFICATIONS_LOADED, notifications);
        })
      );
  }

  /**
   * Get notifications for a specific user
   */
  public getUserNotifications(userId: string): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/user/${userId}`)
      .pipe(
        map(notifications => this.processNotifications(notifications)),
        tap(notifications => {
          this.notificationsSource.next(notifications);
          this.updateUnreadCount();
          this.eventBus.cast(NotificationEvent.NOTIFICATIONS_LOADED, notifications);
        })
      );
  }

  /**
   * Send a new notification
   */
  public sendNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>): Observable<Notification> {
    return this.http.post<Notification>(this.apiUrl, notification)
      .pipe(
        map(newNotification => this.processNotification(newNotification)),
        tap(newNotification => {
          // We don't add it to the local store here because it will come via SignalR
          this.eventBus.cast(NotificationEvent.NOTIFICATION_ADDED, newNotification);
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
    return this.http.put(`${this.apiUrl}/${notificationId}/read`, {})
      .pipe(
        tap(() => {
          // Update the local notification
          const current = this.notificationsSource.value;
          const index = current.findIndex(n => n.id === notificationId);
          
          if (index !== -1) {
            const updatedNotification = { ...current[index], isRead: true };
            this.updateNotificationInLocalStore(updatedNotification);
          }
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
    return this.http.delete(`${this.apiUrl}/${notificationId}`)
      .pipe(
        tap(() => {
          // Remove from local store - will also be handled by SignalR, but we do it here for quick UI response
          this.removeNotificationFromLocalStore(notificationId);
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
