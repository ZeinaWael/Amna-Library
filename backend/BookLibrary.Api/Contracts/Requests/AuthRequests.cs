namespace BookLibrary.Api.Contracts.Requests;

public record LoginRequest(string Email, string Password);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword, string ConfirmNewPassword);
