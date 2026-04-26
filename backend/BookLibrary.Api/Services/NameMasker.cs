namespace BookLibrary.Api.Services;

public interface INameMasker
{
    string Mask(string name);
}

public class NameMasker : INameMasker
{
    public string Mask(string name)
    {
        if (string.IsNullOrWhiteSpace(name)) return string.Empty;
        var parts = name.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return string.Join(' ', parts.Select(MaskPart));
    }

    private static string MaskPart(string part)
    {
        if (part.Length <= 1) return part;
        if (part.Length == 2) return part[0] + "*";
        return part[0] + new string('*', Math.Max(1, part.Length - 2)) + part[^1];
    }
}
