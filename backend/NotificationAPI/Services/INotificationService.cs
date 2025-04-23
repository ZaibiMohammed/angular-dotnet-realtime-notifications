using NotificationAPI.Models;

namespace NotificationAPI.Services
{
    /// <summary>
    /// Interface for notification service operations
    /// </summary>
    public interface INotificationService
    {
        /// <summary>
        /// Gets all notifications
        /// </summary>
        /// <returns>A collection of notifications</returns>
        Task<IEnumerable<Notification>> GetAllNotificationsAsync();

        /// <summary>
        /// Gets notifications for a specific user
        /// </summary>
        /// <param name="userId">The user ID</param>
        /// <returns>A collection of notifications for the specified user</returns>
        Task<IEnumerable<Notification>> GetUserNotificationsAsync(string userId);

        /// <summary>
        /// Sends a new notification
        /// </summary>
        /// <param name="notification">The notification to send</param>
        /// <returns>The created notification</returns>
        Task<Notification> SendNotificationAsync(Notification notification);

        /// <summary>
        /// Marks a notification as read
        /// </summary>
        /// <param name="notificationId">The notification ID</param>
        /// <returns>True if successful, false otherwise</returns>
        Task<bool> MarkAsReadAsync(Guid notificationId);

        /// <summary>
        /// Marks all notifications for a user as read
        /// </summary>
        /// <param name="userId">The user ID</param>
        /// <returns>True if successful, false otherwise</returns>
        Task<bool> MarkAllAsReadAsync(string userId);

        /// <summary>
        /// Deletes a notification
        /// </summary>
        /// <param name="notificationId">The notification ID</param>
        /// <returns>True if successful, false otherwise</returns>
        Task<bool> DeleteNotificationAsync(Guid notificationId);
    }
}
