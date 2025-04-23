namespace NotificationAPI.Models
{
    /// <summary>
    /// Represents a notification entity
    /// </summary>
    public class Notification
    {
        /// <summary>
        /// Unique identifier for the notification
        /// </summary>
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// The title of the notification
        /// </summary>
        public string Title { get; set; } = string.Empty;
        
        /// <summary>
        /// The message content of the notification
        /// </summary>
        public string Message { get; set; } = string.Empty;
        
        /// <summary>
        /// The type of notification (info, warning, error, success)
        /// </summary>
        public NotificationType Type { get; set; } = NotificationType.Info;
        
        /// <summary>
        /// The timestamp when the notification was created
        /// </summary>
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        
        /// <summary>
        /// Flag indicating if the notification has been read
        /// </summary>
        public bool IsRead { get; set; } = false;
        
        /// <summary>
        /// Optional user ID that the notification is targeted to (null means broadcast to all)
        /// </summary>
        public string? UserId { get; set; }
    }

    /// <summary>
    /// Enumeration of notification types
    /// </summary>
    public enum NotificationType
    {
        Info,
        Success,
        Warning,
        Error
    }
}
