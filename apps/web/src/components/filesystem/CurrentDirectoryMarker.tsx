export function CurrentDirectoryMarker() {
  return (
    <span
      aria-label="Current directory"
      title="You are here"
      style={{
        display: "inline-block",
        width: "7px",
        height: "7px",
        borderRadius: "50%",
        background: "var(--role-location)",
        marginRight: "4px",
        flexShrink: 0,
      }}
    />
  );
}
