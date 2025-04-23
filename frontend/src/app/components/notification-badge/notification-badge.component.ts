import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notification-badge',
  templateUrl: './notification-badge.component.html',
  styleUrls: ['./notification-badge.component.scss']
})
export class NotificationBadgeComponent implements OnInit {
  unreadCount$: Observable<number>;
  isOpen = false;

  constructor(private notificationService: NotificationService) {
    this.unreadCount$ = this.notificationService.unreadCount$;
  }

  ngOnInit(): void {
    // Initialize notification service if not already done
    // Note: In a real app, you might want to initialize this at app startup
    const userId = 'user1'; // Example user ID - normally from auth service
    this.notificationService.initialize(userId).catch(err => {
      console.error('Failed to initialize notification service:', err);
    });
  }

  /**
   * Toggle the notification panel
   */
  toggleNotifications(): void {
    this.isOpen = !this.isOpen;
  }
}
