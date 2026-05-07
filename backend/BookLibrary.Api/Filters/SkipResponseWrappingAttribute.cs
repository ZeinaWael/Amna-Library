namespace BookLibrary.Api.Filters;

[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = false, Inherited = true)]
public sealed class SkipResponseWrappingAttribute : Attribute;
