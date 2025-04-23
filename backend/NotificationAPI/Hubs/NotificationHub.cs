using Microsoft.AspNetCore.SignalR;
using NotificationAPI.Models;

namespace NotificationAPI.Hubs
{
    /// <summary>
    /// SignalR hub for real-time notification handling
    /// </summary>
    public class NotificationHub : Hub
    {
        private readonly ILogger<NotificationHub> _logger;

        public NotificationHub(ILogger<NotificationHub> logger)
        {
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Called when a connection is established
        /// </summary>
        /// <returns>A task that represents the asynchronous operation</returns>
        public override async Task OnConnectedAsync()
        {
            string connectionId = Context.ConnectionId;
            _logger.LogInformation("Client connected: {ConnectionId}", connectionId);
            
            await Clients.Caller.SendAsync("ConnectionEstablished", connectionId);
            await base.OnConnectedAsync();
        }

        /// <summary>
        /// Called when a connection is terminated
        /// </summary>
        /// <param name="exception">The exception that caused the connection to close, if any</param>
        /// <returns>A task that represents the asynchronous operation</returns>
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            string connectionId = Context.ConnectionId;
            _logger.LogInformation("Client disconnected: {ConnectionId}", connectionId);
            
            if (exception != null)
            {
                _logger.LogError(exception, "Client disconnected with error: {ConnectionId}", connectionId);
            }
            
            await base.OnDisconnectedAsync(exception);
        }

        /// <summary>
        /// Join a specific notification group (e.g., by user ID, department, etc.)
        /// </summary>
        /// <param name="groupName">The name of the group to join</param>
        /// <returns>A task that represents the asynchronous operation</returns>
        public async Task JoinGroup(string groupName)
        {
            if (string.IsNullOrEmpty(groupName))
            {
                throw new ArgumentException("Group name cannot be null or empty", nameof(groupName));
            }

            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
            _logger.LogInformation("Client {ConnectionId} joined group: {GroupName}", Context.ConnectionId, groupName);
            
            await Clients.Caller.SendAsync("JoinedGroup", groupName);
        }

        /// <summary>
        /// Leave a specific notification group
        /// </summary>
        /// <param name="groupName">The name of the group to leave</param>
        /// <returns>A task that represents the asynchronous operation</returns>
        public async Task LeaveGroup(string groupName)
        {
            if (string.IsNullOrEmpty(groupName))
            {
                throw new ArgumentException("Group name cannot be null or empty", nameof(groupName));
            }

            await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
            _logger.LogInformation("Client {ConnectionId} left group: {GroupName}", Context.ConnectionId, groupName);
            
            await Clients.Caller.SendAsync("LeftGroup", groupName);
        }
        
        /// <summary>
        /// Acknowledge receipt of a notification
        /// </summary>
        /// <param name="notificationId">The ID of the notification to acknowledge</param>
        /// <returns>A task that represents the asynchronous operation</returns>
        public async Task AcknowledgeNotification(Guid notificationId)
        {
            _logger.LogInformation("Notification acknowledged by client {ConnectionId}: {NotificationId}", 
                Context.ConnectionId, notificationId);
            
            // In a real application, you might update a database here
            
            // Notify other clients if needed (e.g., for shared dashboards)
            await Clients.Others.SendAsync("NotificationAcknowledged", notificationId, Context.ConnectionId);
        }
    }
}
