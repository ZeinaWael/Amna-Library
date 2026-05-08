using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BookLibrary.Api.Entities;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace BookLibrary.Api.Infrastructure.Auth;

public interface IJwtTokenService
{
    (string token, DateTime expiresAt) Issue(User user);
}

public class JwtTokenService : IJwtTokenService
{
    private readonly JwtOptions _opt;
    public JwtTokenService(IOptions<JwtOptions> opt) => _opt = opt.Value;

    public const string PasswordIssuedAtClaim = "pwd_iat";

    public (string token, DateTime expiresAt) Issue(User user)
    {
        var expires = DateTime.UtcNow.AddHours(_opt.ExpiryHours);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(ClaimTypes.Role, user.Role),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };

        // Skip pwd_iat for the bootstrap pseudo-user (Guid.Empty); it has no
        // DB row, so the validation check has nothing to compare against.
        if (user.Id != Guid.Empty)
        {
            var pwdIat = new DateTimeOffset(DateTime.SpecifyKind(user.PasswordChangedAt, DateTimeKind.Utc))
                .ToUnixTimeSeconds();
            claims.Add(new Claim(PasswordIssuedAtClaim, pwdIat.ToString(), ClaimValueTypes.Integer64));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_opt.Key));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(_opt.Issuer, _opt.Audience, claims,
            expires: expires, signingCredentials: creds);
        return (new JwtSecurityTokenHandler().WriteToken(token), expires);
    }
}
