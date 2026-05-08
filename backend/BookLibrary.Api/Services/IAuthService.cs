using BookLibrary.Api.Contracts.Requests;
using BookLibrary.Api.Contracts.Responses;
using BookLibrary.Api.Entities;
using BookLibrary.Api.Infrastructure.Auth;
using BookLibrary.Api.Infrastructure.Middleware;
using BookLibrary.Api.Repositories;
using Microsoft.Extensions.Options;

namespace BookLibrary.Api.Services;

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest req, CancellationToken ct);
    Task ChangePasswordAsync(Guid userId, ChangePasswordRequest req, CancellationToken ct);
}

public class AuthService : IAuthService
{
    private readonly IUserRepository _users;
    private readonly IPasswordHasher _hasher;
    private readonly IJwtTokenService _jwt;
    private readonly BootstrapAdminOptions _bootstrap;
    private readonly ILogger<AuthService> _log;

    public AuthService(
        IUserRepository users,
        IPasswordHasher hasher,
        IJwtTokenService jwt,
        IOptions<BootstrapAdminOptions> bootstrap,
        ILogger<AuthService> log)
    {
        _users = users;
        _hasher = hasher;
        _jwt = jwt;
        _bootstrap = bootstrap.Value;
        _log = log;
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest req, CancellationToken ct)
    {
        var emailNorm = req.Email.Trim().ToLowerInvariant();

        if (!string.IsNullOrWhiteSpace(_bootstrap.Email)
            && !string.IsNullOrWhiteSpace(_bootstrap.Password)
            && string.Equals(emailNorm, _bootstrap.Email.Trim().ToLowerInvariant(), StringComparison.Ordinal)
            && req.Password == _bootstrap.Password)
        {
            var pseudo = new User
            {
                Id = Guid.Empty,
                Email = emailNorm,
                Role = "Admin",
                PasswordHash = "",
            };
            var (tk, exp) = _jwt.Issue(pseudo);
            return new LoginResponse(tk, exp, new UserDto(pseudo.Email, pseudo.Role));
        }

        try
        {
            var user = await _users.GetByEmailAsync(emailNorm, ct);
            if (user is null || !_hasher.Verify(req.Password, user.PasswordHash))
                throw AppException.Unauthorized("Invalid credentials.");

            var (token, expiresAt) = _jwt.Issue(user);
            return new LoginResponse(token, expiresAt, new UserDto(user.Email, user.Role));
        }
        catch (AppException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Login DB lookup failed; rejecting as invalid credentials.");
            throw AppException.Unauthorized("Invalid credentials.");
        }
    }

    public async Task ChangePasswordAsync(Guid userId, ChangePasswordRequest req, CancellationToken ct)
    {
        // Reject the bootstrap pseudo-user (no DB row to update).
        if (userId == Guid.Empty)
            throw AppException.Unauthorized("Invalid session.");

        var user = await _users.GetByIdAsync(userId, ct);
        if (user is null)
            throw AppException.Unauthorized("Invalid session.");

        // Verify current password BEFORE running expensive validation so we
        // don't leak which rule failed via timing on bad-credential attempts.
        if (string.IsNullOrEmpty(req.CurrentPassword) ||
            !_hasher.Verify(req.CurrentPassword, user.PasswordHash))
        {
            throw AppException.BadRequest(
                "Current password is incorrect.",
                new[] { "currentPassword" });
        }

        var errors = ValidateNewPassword(req);
        if (errors.Count > 0)
            throw AppException.BadRequest("Validation failed.", errors);

        var newHash = _hasher.Hash(req.NewPassword);
        var changedAt = DateTime.UtcNow;
        await _users.UpdatePasswordAsync(user.Id, newHash, changedAt, ct);
    }

    private static List<string> ValidateNewPassword(ChangePasswordRequest req)
    {
        // Field-name keys; the frontend maps these to localized strings.
        var errors = new List<string>();
        var p = req.NewPassword ?? string.Empty;

        if (p.Length < 12) errors.Add("newPassword.tooShort");
        if (!p.Any(char.IsUpper)) errors.Add("newPassword.missingUpper");
        if (!p.Any(char.IsLower)) errors.Add("newPassword.missingLower");
        if (!p.Any(char.IsDigit)) errors.Add("newPassword.missingDigit");
        if (p.All(char.IsLetterOrDigit)) errors.Add("newPassword.missingSymbol");
        if (string.Equals(p, req.CurrentPassword, StringComparison.Ordinal))
            errors.Add("newPassword.sameAsOld");
        if (!string.Equals(p, req.ConfirmNewPassword, StringComparison.Ordinal))
            errors.Add("confirmNewPassword.mismatch");

        return errors;
    }
}
