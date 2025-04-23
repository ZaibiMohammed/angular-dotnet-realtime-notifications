import { Component, OnInit } from '@angular/core';
import { NotificationService } from './services/notification.service';
import { SignalRService } from './services/signalr.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Real-time Notifications';
  connectionStatus$ = this.signalRService.connectionState$;

  constructor(
    private notificationService: NotificationService,
    private signalRService: SignalRService
  ) {}

  ngOnInit(): void {
    // Initialize the connection in the app component
    // This ensures the connection is established once at app startup
    const userId = 'user1'; // In a real app, this would come from auth service
    this.notificationService.initialize(userId).catch(err => {
      console.error('Failed to initialize notification service:', err);
    });
  }
}
