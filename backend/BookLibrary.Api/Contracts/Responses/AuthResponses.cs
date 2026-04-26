namespace BookLibrary.Api.Contracts.Responses;

public record UserDto(string Email, string Role);
public record LoginResponse(string Token, DateTime ExpiresAt, UserDto User);
