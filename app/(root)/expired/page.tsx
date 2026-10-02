export default function ExpiredPage({
  searchParams,
}: {
  searchParams?: { c?: string };
}) {
  return (
    <div className="container prose">
      <h1>Shortlink kedaluwarsa</h1>
      <p className="muted">
        Shortlink{searchParams?.c ? ` “${searchParams.c}”` : ""} sudah kedaluwarsa.
      </p>
      <p><a href="/">Buat link baru</a></p>
    </div>
  );
}
