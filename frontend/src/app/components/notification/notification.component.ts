import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Notification, NotificationType } from '../../models/notification.model';

@Component({
  selector: 'app-notification',
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.scss']
})
export class NotificationComponent implements OnInit {
  @Input() notification!: Notification;
  @Output() markAsRead = new EventEmitter<string>();
  @Output() delete = new EventEmitter<string>();
  
  // Expose NotificationType enum to template
  NotificationType = NotificationType;
  
  // Time ago text (updated every minute)
  timeAgoText: string = '';
  private updateIntervalId?: number;

  ngOnInit(): void {
    // Set initial time ago text
    this.updateTimeAgo();
    
    // Update time ago text every minute
    this.updateIntervalId = window.setInterval(() => {
      this.updateTimeAgo();
    }, 60000); // Update every minute
  }

  ngOnDestroy(): void {
    // Clear interval when component is destroyed
    if (this.updateIntervalId) {
      clearInterval(this.updateIntervalId);
    }
  }

  /**
   * Get the CSS class for the notification based on its type
   */
  getNotificationClass(): string {
    switch (this.notification.type) {
      case NotificationType.Info:
        return 'notification-info';
      case NotificationType.Success:
        return 'notification-success';
      case NotificationType.Warning:
        return 'notification-warning';
      case NotificationType.Error:
        return 'notification-error';
      default:
        return 'notification-info';
    }
  }

  /**
   * Get the icon class for the notification based on its type
   */
  getIconClass(): string {
    switch (this.notification.type) {
      case NotificationType.Info:
        return 'bi bi-info-circle';
      case NotificationType.Success:
        return 'bi bi-check-circle';
      case NotificationType.Warning:
        return 'bi bi-exclamation-triangle';
      case NotificationType.Error:
        return 'bi bi-x-circle';
      default:
        return 'bi bi-info-circle';
    }
  }

  /**
   * Update the time ago text based on the notification timestamp
   */
  private updateTimeAgo(): void {
    const now = new Date();
    const timestamp = this.notification.timestamp;
    
    const seconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000);
    
    // Format time ago text
    if (seconds < 60) {
      this.timeAgoText = 'Just now';
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      this.timeAgoText = `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    } else if (seconds < 86400) {
      const hours = Math.floor(seconds / 3600);
      this.timeAgoText = `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    } else {
      const days = Math.floor(seconds / 86400);
      this.timeAgoText = `${days} ${days === 1 ? 'day' : 'days'} ago`;
    }
  }

  /**
   * Handle mark as read button click
   */
  onMarkAsRead(): void {
    this.markAsRead.emit(this.notification.id);
  }

  /**
   * Handle delete button click
   */
  onDelete(): void {
    this.delete.emit(this.notification.id);
  }
}
