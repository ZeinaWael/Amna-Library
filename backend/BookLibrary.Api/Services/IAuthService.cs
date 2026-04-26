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
}
