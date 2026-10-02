export default function DisabledPage({
  searchParams,
}: {
  searchParams?: { c?: string };
}) {
  return (
    <div className="container prose">
      <h1>Link dinonaktifkan</h1>
      <p className="muted">
        Shortlink{searchParams?.c ? ` “${searchParams.c}”` : ""} telah dinonaktifkan,
        kemungkinan karena pelanggaran ketentuan.
      </p>
      <p>
        Merasa ini keliru? Hubungi admin. Menemukan abuse lain?{" "}
        <a href="/report-abuse">Laporkan di sini</a>.
      </p>
      <p><a href="/">Kembali ke beranda</a></p>
    </div>
  );
}
