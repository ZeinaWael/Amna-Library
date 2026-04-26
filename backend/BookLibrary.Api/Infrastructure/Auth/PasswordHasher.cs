namespace BookLibrary.Api.Infrastructure.Auth;

public interface IPasswordHasher
{
    string Hash(string plain);
    bool Verify(string plain, string hash);
}

public class PasswordHasher : IPasswordHasher
{
    public string Hash(string plain) => BCrypt.Net.BCrypt.HashPassword(plain, workFactor: 11);
    public bool Verify(string plain, string hash) => BCrypt.Net.BCrypt.Verify(plain, hash);
}
