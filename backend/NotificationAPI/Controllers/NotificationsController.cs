using Microsoft.AspNetCore.Mvc;
using NotificationAPI.Models;
using NotificationAPI.Services;

namespace NotificationAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class NotificationsController : ControllerBase
    {
        private readonly INotificationService _notificationService;
        private readonly ILogger<NotificationsController> _logger;

        public NotificationsController(
            INotificationService notificationService,
            ILogger<NotificationsController> logger)
        {
            _notificationService = notificationService ?? throw new ArgumentNullException(nameof(notificationService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Gets all notifications
        /// </summary>
        /// <returns>A collection of all notifications</returns>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<Notification>>> GetAllNotifications()
        {
            var notifications = await _notificationService.GetAllNotificationsAsync();
            return Ok(notifications);
        }

        /// <summary>
        /// Gets notifications for a specific user
        /// </summary>
        /// <param name="userId">The user ID</param>
        /// <returns>A collection of notifications for the specified user</returns>
        [HttpGet("user/{userId}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<IEnumerable<Notification>>> GetUserNotifications(string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return BadRequest("User ID is required");
            }

            try
            {
                var notifications = await _notificationService.GetUserNotificationsAsync(userId);
                return Ok(notifications);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid argument when getting user notifications");
                return BadRequest(ex.Message);
            }
        }

        /// <summary>
        /// Sends a new notification
        /// </summary>
        /// <param name="notification">The notification to send</param>
        /// <returns>The created notification</returns>
        [HttpPost]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<Notification>> SendNotification(Notification notification)
        {
            if (notification == null)
            {
                return BadRequest("Notification data is required");
            }

            try
            {
                var result = await _notificationService.SendNotificationAsync(notification);
                return CreatedAtAction(nameof(GetAllNotifications), new { id = result.Id }, result);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid argument when sending notification");
                return BadRequest(ex.Message);
            }
        }

        /// <summary>
        /// Marks a notification as read
        /// </summary>
        /// <param name="id">The notification ID</param>
        /// <returns>A success message if successful</returns>
        [HttpPut("{id}/read")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult> MarkAsRead(Guid id)
        {
            var result = await _notificationService.MarkAsReadAsync(id);
            
            if (!result)
            {
                return NotFound($"Notification with ID {id} not found");
            }

            return Ok(new { message = "Notification marked as read" });
        }

        /// <summary>
        /// Marks all notifications for a user as read
        /// </summary>
        /// <param name="userId">The user ID</param>
        /// <returns>A success message if successful</returns>
        [HttpPut("user/{userId}/read-all")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult> MarkAllAsRead(string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return BadRequest("User ID is required");
            }

            try
            {
                await _notificationService.MarkAllAsReadAsync(userId);
                return Ok(new { message = "All notifications marked as read" });
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid argument when marking all notifications as read");
                return BadRequest(ex.Message);
            }
        }

        /// <summary>
        /// Deletes a notification
        /// </summary>
        /// <param name="id">The notification ID</param>
        /// <returns>A success message if successful</returns>
        [HttpDelete("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult> DeleteNotification(Guid id)
        {
            var result = await _notificationService.DeleteNotificationAsync(id);
            
            if (!result)
            {
                return NotFound($"Notification with ID {id} not found");
            }

            return Ok(new { message = "Notification deleted successfully" });
        }

        /// <summary>
        /// Generates a test notification
        /// </summary>
        /// <returns>The created test notification</returns>
        [HttpPost("test")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        public async Task<ActionResult<Notification>> CreateTestNotification()
        {
            var notification = new Notification
            {
                Title = "Test Notification",
                Message = $"This is a test notification created at {DateTime.UtcNow}",
                Type = NotificationType.Info,
                UserId = null // Broadcast to all users
            };

            var result = await _notificationService.SendNotificationAsync(notification);
            return CreatedAtAction(nameof(GetAllNotifications), new { id = result.Id }, result);
        }
    }
}
