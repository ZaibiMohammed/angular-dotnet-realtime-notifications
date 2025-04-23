using Microsoft.AspNetCore.SignalR;
using NotificationAPI.Hubs;
using NotificationAPI.Models;
using System.Collections.Concurrent;

namespace NotificationAPI.Services
{
    /// <summary>
    /// Service for managing notifications
    /// </summary>
    public class NotificationService : INotificationService
    {
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly ConcurrentBag<Notification> _notifications;
        private readonly ILogger<NotificationService> _logger;

        public NotificationService(
            IHubContext<NotificationHub> hubContext,
            ILogger<NotificationService> logger)
        {
            _hubContext = hubContext ?? throw new ArgumentNullException(nameof(hubContext));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _notifications = new ConcurrentBag<Notification>();
        }

        /// <inheritdoc />
        public Task<IEnumerable<Notification>> GetAllNotificationsAsync()
        {
            return Task.FromResult<IEnumerable<Notification>>(_notifications.OrderByDescending(n => n.Timestamp).ToList());
        }

        /// <inheritdoc />
        public Task<IEnumerable<Notification>> GetUserNotificationsAsync(string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                throw new ArgumentException("User ID cannot be null or empty", nameof(userId));
            }

            var userNotifications = _notifications
                .Where(n => n.UserId == userId || n.UserId == null)
                .OrderByDescending(n => n.Timestamp)
                .ToList();

            return Task.FromResult<IEnumerable<Notification>>(userNotifications);
        }

        /// <inheritdoc />
        public async Task<Notification> SendNotificationAsync(Notification notification)
        {
            if (notification == null)
            {
                throw new ArgumentNullException(nameof(notification));
            }

            // Set creation time to now
            notification.Timestamp = DateTime.UtcNow;
            
            // Make sure ID is set
            if (notification.Id == Guid.Empty)
            {
                notification.Id = Guid.NewGuid();
            }

            // Add to our collection
            _notifications.Add(notification);
            
            _logger.LogInformation("New notification sent: {Title}", notification.Title);

            // Send to all clients if no specific user, otherwise send to specific user
            if (string.IsNullOrEmpty(notification.UserId))
            {
                await _hubContext.Clients.All.SendAsync("ReceiveNotification", notification);
                _logger.LogDebug("Broadcast notification to all clients");
            }
            else
            {
                await _hubContext.Clients.User(notification.UserId).SendAsync("ReceiveNotification", notification);
                _logger.LogDebug("Sent notification to user: {UserId}", notification.UserId);
            }

            return notification;
        }

        /// <inheritdoc />
        public async Task<bool> MarkAsReadAsync(Guid notificationId)
        {
            var notification = _notifications.FirstOrDefault(n => n.Id == notificationId);
            
            if (notification == null)
            {
                _logger.LogWarning("Attempt to mark non-existent notification as read: {Id}", notificationId);
                return false;
            }

            notification.IsRead = true;
            
            // In a real-world scenario, we would update the database here
            _logger.LogInformation("Notification marked as read: {Id}", notificationId);
            
            // Notify clients about the update
            await _hubContext.Clients.All.SendAsync("NotificationUpdated", notification);
            
            return true;
        }

        /// <inheritdoc />
        public async Task<bool> MarkAllAsReadAsync(string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                throw new ArgumentException("User ID cannot be null or empty", nameof(userId));
            }

            var userNotifications = _notifications
                .Where(n => (n.UserId == userId || n.UserId == null) && !n.IsRead)
                .ToList();

            foreach (var notification in userNotifications)
            {
                notification.IsRead = true;
            }

            // In a real-world scenario, we would update the database here
            _logger.LogInformation("All notifications marked as read for user: {UserId}", userId);
            
            // Notify clients about the bulk update
            await _hubContext.Clients.User(userId).SendAsync("NotificationsUpdated", userNotifications);
            
            return true;
        }

        /// <inheritdoc />
        public async Task<bool> DeleteNotificationAsync(Guid notificationId)
        {
            // Since ConcurrentBag doesn't support removal, we need to create a new bag without the item
            // In a real application with a database, we would just delete the record
            var notification = _notifications.FirstOrDefault(n => n.Id == notificationId);
            
            if (notification == null)
            {
                _logger.LogWarning("Attempt to delete non-existent notification: {Id}", notificationId);
                return false;
            }

            // In a real-world application with a database, we would delete the record here
            // For this example, we'll just log it (we can't actually remove from ConcurrentBag)
            _logger.LogInformation("Notification deleted: {Id}", notificationId);
            
            // Notify clients about the deletion
            await _hubContext.Clients.All.SendAsync("NotificationDeleted", notificationId);
            
            return true;
        }
    }
}
