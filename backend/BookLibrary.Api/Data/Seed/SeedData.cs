using BookLibrary.Api.Entities;
using BookLibrary.Api.Infrastructure.Auth;
using Microsoft.EntityFrameworkCore;

namespace BookLibrary.Api.Data.Seed;

public static class SeedData
{
    public static async Task EnsureSeededAsync(AppDbContext db, IPasswordHasher hasher, CancellationToken ct)
    {
        await EnsureAdminAsync(db, hasher, ct);
        var genres = await EnsureGenresAsync(db, ct);
        var authors = await EnsureAuthorsAsync(db, ct);
        var books = await EnsureBooksAsync(db, genres, authors, ct);
        await EnsureReviewsAsync(db, books, ct);
        await RecalculateBookRatingsAsync(db, ct);
    }

    private static async Task EnsureAdminAsync(AppDbContext db, IPasswordHasher hasher, CancellationToken ct)
    {
        const string email = "admin@booklibrary.local";
        if (await db.Users.AnyAsync(u => u.Email == email, ct)) return;
        db.Users.Add(new User
        {
            Email = email,
            PasswordHash = hasher.Hash("Admin#12345"),
            Role = "Admin",
        });
        await db.SaveChangesAsync(ct);
    }

    private static async Task<Dictionary<string, Genre>> EnsureGenresAsync(AppDbContext db, CancellationToken ct)
    {
        var seed = new[]
        {
            new Genre { Name = "Fiction", Slug = "fiction" },
            new Genre { Name = "Science", Slug = "science" },
            new Genre { Name = "History", Slug = "history" },
        };

        foreach (var g in seed)
        {
            if (!await db.Genres.AnyAsync(x => x.Slug == g.Slug, ct))
                db.Genres.Add(g);
        }
        await db.SaveChangesAsync(ct);
        return await db.Genres.ToDictionaryAsync(g => g.Slug, ct);
    }

    private static async Task<Dictionary<string, Author>> EnsureAuthorsAsync(AppDbContext db, CancellationToken ct)
    {
        var seed = new[]
        {
            new Author { Name = "Ada Lovelace", Bio = "Mathematician and pioneer of computing." },
            new Author { Name = "Carl Sagan", Bio = "Astronomer and science communicator." },
            new Author { Name = "Naguib Mahfouz", Bio = "Egyptian novelist and Nobel laureate." },
            new Author { Name = "Yuval Noah Harari", Bio = "Historian and author of Sapiens." },
        };

        foreach (var a in seed)
        {
            if (!await db.Authors.AnyAsync(x => x.Name == a.Name, ct))
                db.Authors.Add(a);
        }
        await db.SaveChangesAsync(ct);
        return await db.Authors.ToDictionaryAsync(a => a.Name, ct);
    }

    private static async Task<List<Book>> EnsureBooksAsync(AppDbContext db, Dictionary<string, Genre> genres, Dictionary<string, Author> authors, CancellationToken ct)
    {
        if (await db.Books.AnyAsync(ct))
            return await db.Books.ToListAsync(ct);

        Book B(string title, string desc, string lang, int year, string author, string genre, bool featured, bool withFile) => new()
        {
            Title = title,
            Description = desc,
            Language = lang,
            Year = year,
            AuthorId = authors[author].Id,
            GenreId = genres[genre].Id,
            IsFeatured = featured,
            IsPublished = true,
            FileUrl = withFile ? "https://example.com/storage/v1/object/public/book-files/placeholder.pdf" : null,
            FileSizeBytes = withFile ? 1_200_000 : null,
            PageCount = withFile ? 240 : null,
        };

        var books = new List<Book>
        {
            B("Notes on the Analytical Engine", "Foundational notes on programmable computation.", "en", 1843, "Ada Lovelace", "science", true, true),
            B("Cosmos", "A personal voyage through the universe.", "en", 1980, "Carl Sagan", "science", true, true),
            B("Pale Blue Dot", "A vision of the human future in space.", "en", 1994, "Carl Sagan", "science", false, false),
            B("Palace Walk", "First volume of the Cairo Trilogy.", "en", 1956, "Naguib Mahfouz", "fiction", false, false),
            B("Children of the Alley", "Allegorical novel set in a Cairo alley.", "ar", 1959, "Naguib Mahfouz", "fiction", false, false),
            B("Sapiens", "A brief history of humankind.", "en", 2011, "Yuval Noah Harari", "history", false, false),
            B("Homo Deus", "A brief history of tomorrow.", "en", 2016, "Yuval Noah Harari", "history", false, false),
            B("21 Lessons", "21 lessons for the 21st century.", "en", 2018, "Yuval Noah Harari", "history", false, false),
            B("Contact", "First contact with extraterrestrial intelligence.", "en", 1985, "Carl Sagan", "fiction", false, false),
            B("Midaq Alley", "Novel of life in a Cairo alley during WWII.", "ar", 1947, "Naguib Mahfouz", "fiction", false, false),
        };

        db.Books.AddRange(books);
        await db.SaveChangesAsync(ct);
        return books;
    }

    private static async Task EnsureReviewsAsync(AppDbContext db, List<Book> books, CancellationToken ct)
    {
        if (await db.Reviews.AnyAsync(ct)) return;

        Review R(Book b, string name, string email, int rating, string content) => new()
        {
            BookId = b.Id,
            ReviewerName = name,
            ReviewerEmail = email,
            Rating = rating,
            Content = content,
            Status = ReviewStatus.Approved,
        };

        var picks = new[]
        {
            R(books[0], "Grace Hopper", "grace@example.com", 5, "A timeless contribution to computing."),
            R(books[1], "Mae Jemison", "mae@example.com", 5, "Inspires every generation."),
            R(books[1], "Neil Armstrong", "neil@example.com", 4, "Sweeping and lyrical."),
            R(books[5], "Alex Reader", "alex@example.com", 4, "Makes anthropology gripping."),
            R(books[6], "Sam Reader", "sam@example.com", 4, "Provocative follow-up."),
            R(books[3], "Layla R", "layla@example.com", 5, "Cairo brought to life."),
        };

        db.Reviews.AddRange(picks);
        await db.SaveChangesAsync(ct);
    }

    private static async Task RecalculateBookRatingsAsync(AppDbContext db, CancellationToken ct)
    {
        var stats = await db.Reviews
            .Where(r => r.Status == ReviewStatus.Approved)
            .GroupBy(r => r.BookId)
            .Select(g => new { BookId = g.Key, Avg = g.Average(r => (decimal)r.Rating), Count = g.Count() })
            .ToListAsync(ct);

        foreach (var s in stats)
        {
            await db.Books.Where(b => b.Id == s.BookId)
                .ExecuteUpdateAsync(u => u
                    .SetProperty(b => b.AverageRating, _ => Math.Round(s.Avg, 2))
                    .SetProperty(b => b.ReviewCount, _ => s.Count), ct);
        }
    }
}
