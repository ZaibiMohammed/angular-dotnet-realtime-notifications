import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-test-api',
  template: `
    <div class="test-api-container">
      <h3>API Test Panel</h3>
      <div class="button-group">
        <button (click)="testGetNotifications()">Get All Notifications</button>
        <button (click)="testSendTestNotification()">Send Test Notification</button>
        <button (click)="testSendCustomNotification()">Send Custom Notification</button>
      </div>
      <div *ngIf="result" class="result">
        <h4>API Response:</h4>
        <pre>{{ result | json }}</pre>
      </div>
      <div *ngIf="error" class="error">
        <h4>Error:</h4>
        <pre>{{ error }}</pre>
      </div>
    </div>
  `,
  styles: [`
    .test-api-container {
      padding: 20px;
      border: 1px solid #ccc;
      border-radius: 5px;
      margin-top: 20px;
    }
    .button-group {
      margin-bottom: 15px;
    }
    button {
      margin-right: 10px;
      padding: 8px 16px;
      background-color: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    button:hover {
      background-color: #45a049;
    }
    .result {
      background-color: #f5f5f5;
      padding: 10px;
      border-radius: 4px;
      max-height: 300px;
      overflow: auto;
    }
    .error {
      background-color: #ffebee;
      color: #d32f2f;
      padding: 10px;
      border-radius: 4px;
    }
    pre {
      white-space: pre-wrap;
      word-wrap: break-word;
    }
  `]
})
export class TestApiComponent {
  result: any = null;
  error: string | null = null;
  
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  testGetNotifications() {
    this.resetState();
    console.log('Testing GET notifications from:', `${this.apiUrl}/notifications`);
    
    this.http.get(`${this.apiUrl}/notifications`).subscribe({
      next: (response) => {
        console.log('GET notifications response:', response);
        this.result = response;
      },
      error: (err) => {
        console.error('GET notifications error:', err);
        this.handleError(err);
      }
    });
  }

  testSendTestNotification() {
    this.resetState();
    console.log('Testing POST test notification to:', `${this.apiUrl}/notifications/test`);
    
    this.http.post(`${this.apiUrl}/notifications/test`, {}).subscribe({
      next: (response) => {
        console.log('POST test notification response:', response);
        this.result = response;
      },
      error: (err) => {
        console.error('POST test notification error:', err);
        this.handleError(err);
      }
    });
  }

  testSendCustomNotification() {
    this.resetState();
    const notification = {
      title: 'API Test Notification',
      message: `This is a test notification sent at ${new Date().toLocaleTimeString()}`,
      type: 0, // Info type
      userId: null // Broadcast to all
    };
    
    console.log('Testing POST custom notification to:', `${this.apiUrl}/notifications`);
    console.log('Notification data:', notification);
    
    this.http.post(`${this.apiUrl}/notifications`, notification).subscribe({
      next: (response) => {
        console.log('POST custom notification response:', response);
        this.result = response;
      },
      error: (err) => {
        console.error('POST custom notification error:', err);
        this.handleError(err);
      }
    });
  }

  private resetState() {
    this.result = null;
    this.error = null;
  }

  private handleError(err: any) {
    if (err.error instanceof Error) {
      // Client-side error
      this.error = `Client-side error: ${err.error.message}`;
    } else {
      // Server-side error
      this.error = `Server returned code ${err.status}, message: ${err.message}`;
      if (err.error) {
        this.error += `\nDetails: ${JSON.stringify(err.error)}`;
      }
    }
  }
}
