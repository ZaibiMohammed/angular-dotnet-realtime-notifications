import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NgEventBus } from 'ng-event-bus';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NotificationComponent } from './components/notification/notification.component';
import { NotificationBadgeComponent } from './components/notification-badge/notification-badge.component';

@NgModule({
  declarations: [
    AppComponent,
    NotificationComponent,
    NotificationBadgeComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule
  ],
  providers: [
    NgEventBus
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
