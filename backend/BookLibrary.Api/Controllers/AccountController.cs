using System.IdentityModel.Tokens.Jwt;
using BookLibrary.Api.Contracts.Requests;
using BookLibrary.Api.Infrastructure.Middleware;
using BookLibrary.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace BookLibrary.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/auth/account")]
public class AccountController : ControllerBase
{
    public const string ChangePasswordRateLimitPolicy = "change-password";

    private readonly IAuthService _auth;
    public AccountController(IAuthService auth) => _auth = auth;

    [HttpPost("change-password")]
    [EnableRateLimiting(ChangePasswordRateLimitPolicy)]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest req, CancellationToken ct)
    {
        var sub = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        if (string.IsNullOrEmpty(sub) || !Guid.TryParse(sub, out var userId))
            throw AppException.Unauthorized("Invalid session.");

        await _auth.ChangePasswordAsync(userId, req, ct);
        return NoContent();
    }
}
