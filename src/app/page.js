export default function Home() {
  return (
    <main style={{ padding: "40px" }}>
      <h1>Consent Engine Test</h1>
      <p>
        Open DevTools → Network tab → Reload page → Reject cookies →
        confirm no analytics requests fire.
      </p>
    </main>
  );
}
