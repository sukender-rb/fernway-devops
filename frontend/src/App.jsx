import { useState, useMemo, useEffect } from "react";
import { Leaf, ShoppingBag, X, Plus, Minus, Sun, Droplet, Check, AlertCircle } from "lucide-react";

// Where the backend API lives. Set VITE_API_URL when building for a
// different environment (staging/prod); defaults to local dev.
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

function Badge({ children }) {
  return (
    <span style={{
      fontSize: 12, padding: "3px 9px", borderRadius: 20,
      background: "#2A3B2C", color: "#C9A227", border: "1px solid #3A4E3C",
      letterSpacing: "0.02em"
    }}>{children}</span>
  );
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [productsError, setProductsError] = useState(null);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [checkout, setCheckout] = useState(false);
  const [payment, setPayment] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(null); // holds the order response, or null
  const [orderError, setOrderError] = useState(null);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", address: "" });
  const [card, setCard] = useState({ number: "", expiry: "", cvv: "" });

  // Load the real product catalog from the backend on first render.
  useEffect(() => {
    fetch(`${API_BASE}/api/products`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        return res.json();
      })
      .then((data) => setProducts(data))
      .catch((err) => setProductsError(err.message))
      .finally(() => setLoadingProducts(false));
  }, []);

  const cartItems = useMemo(
    () => Object.entries(cart).map(([id, qty]) => ({ ...products.find((p) => p.id === id), qty })),
    [cart, products]
  );
  const totalCents = cartItems.reduce((sum, i) => sum + (i.price_cents || 0) * i.qty, 0);
  const total = (totalCents / 100).toFixed(2);
  const count = cartItems.reduce((sum, i) => sum + i.qty, 0);

  const addToCart = (id) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const changeQty = (id, delta) => setCart((c) => {
    const next = { ...c, [id]: (c[id] || 0) + delta };
    if (next[id] <= 0) delete next[id];
    return next;
  });

  const goToPayment = (e) => {
    e.preventDefault();
    setPayment(true);
  };

  const placeOrder = async (e) => {
    e.preventDefault();
    setOrderError(null);
    setPlacingOrder(true);
    try {
      // Real network call: the backend recalculates the total itself,
      // we only send product ids and quantities.
      const res = await fetch(`${API_BASE}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: form,
          items: cartItems.map((i) => ({ id: i.id, qty: i.qty })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server returned ${res.status}`);
      }
      const order = await res.json();
      setOrderPlaced(order);
      setCart({});
    } catch (err) {
      setOrderError(err.message);
    } finally {
      setPlacingOrder(false);
    }
  };

  const closeCart = () => {
    setCartOpen(false);
    setCheckout(false);
    setPayment(false);
    setOrderPlaced(null);
    setOrderError(null);
  };

  return (
    <div style={{ background: "#14201A", minHeight: "100vh", fontFamily: "Georgia, 'Times New Roman', serif", color: "#EDE6D6" }}>
      {/* Header */}
      <header style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "20px 32px", borderBottom: "1px solid #253226", position: "sticky", top: 0,
        background: "#14201A", zIndex: 10
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Leaf size={22} color="#C9A227" />
          <span style={{ fontSize: 22, letterSpacing: "0.02em" }}>Fernway</span>
        </div>
        <nav style={{ display: "flex", alignItems: "center", gap: 28, fontFamily: "system-ui, sans-serif", fontSize: 14, color: "#9CA79A" }}>
          <span>Plants</span>
          <span>Care guides</span>
          <span>About</span>
          <button
            onClick={() => setCartOpen(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6, background: "#1C2B22",
              border: "1px solid #3A4E3C", borderRadius: 8, padding: "8px 14px",
              color: "#EDE6D6", cursor: "pointer", fontSize: 14
            }}
          >
            <ShoppingBag size={16} />
            {count > 0 && <span style={{ color: "#C9A227" }}>{count}</span>}
          </button>
        </nav>
      </header>

      {/* Hero */}
      <section style={{ padding: "72px 32px 56px", maxWidth: 720 }}>
        <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 13, letterSpacing: "0.12em", color: "#7C9473", textTransform: "uppercase", marginBottom: 14 }}>
          Rooted in your routine
        </p>
        <h1 style={{ fontSize: 44, lineHeight: 1.15, margin: "0 0 18px", fontWeight: 400 }}>
          Plants chosen for the light you actually have.
        </h1>
        <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 16, lineHeight: 1.7, color: "#B7BEB4", maxWidth: 480 }}>
          Every plant here lists its real light and water needs, no guesswork. Pick what fits your space, we deliver it thriving.
        </p>
      </section>

      {/* Product grid */}
      {loadingProducts && (
        <p style={{ padding: "0 32px 64px", fontFamily: "system-ui, sans-serif", color: "#9CA79A" }}>Loading plants…</p>
      )}
      {productsError && (
        <div style={{ margin: "0 32px 64px", padding: 16, background: "#3B2323", border: "1px solid #5A3434", borderRadius: 8, display: "flex", gap: 10, alignItems: "flex-start", maxWidth: 480, fontFamily: "system-ui, sans-serif" }}>
          <AlertCircle size={18} color="#E08585" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ margin: "0 0 4px", color: "#E08585", fontSize: 14 }}>Couldn't reach the backend.</p>
            <p style={{ margin: 0, color: "#B7BEB4", fontSize: 13 }}>Make sure the API is running at {API_BASE} (check <code>docker compose up</code>). {productsError}</p>
          </div>
        </div>
      )}
      {!loadingProducts && !productsError && (
        <section style={{ padding: "0 32px 64px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 24, maxWidth: 1080 }}>
          {products.map((p) => (
            <div key={p.id}
              onClick={() => setSelected(p)}
              style={{
                background: "#1C2B22", border: "1px solid #253226", borderRadius: 12,
                padding: 20, cursor: "pointer", transition: "border-color 0.15s"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#3A4E3C")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#253226")}
            >
              <div style={{ fontSize: 48, textAlign: "center", padding: "16px 0" }}>{p.image_emoji}</div>
              <div style={{ fontFamily: "system-ui, sans-serif" }}>
                <div style={{ marginBottom: 6 }}><Badge>{p.tag}</Badge></div>
                <h3 style={{ fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 400, margin: "8px 0 4px", color: "#EDE6D6" }}>{p.name}</h3>
                <p style={{ fontSize: 14, color: "#9CA79A", margin: "0 0 12px" }}>${(p.price_cents / 100).toFixed(2)}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); addToCart(p.id); }}
                  style={{
                    width: "100%", padding: "9px 0", background: "#C9A227", color: "#14201A",
                    border: "none", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer"
                  }}
                >
                  Add to cart
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Product detail modal */}
      {selected && !cartOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,15,11,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 20 }}
          onClick={() => setSelected(null)}>
          <div style={{ background: "#1C2B22", borderRadius: 16, maxWidth: 420, width: "100%", padding: 32, fontFamily: "system-ui, sans-serif" }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ fontSize: 64 }}>{selected.image_emoji}</div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#9CA79A", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <h2 style={{ fontFamily: "Georgia, serif", fontWeight: 400, fontSize: 24, margin: "16px 0 4px", color: "#EDE6D6" }}>{selected.name}</h2>
            <p style={{ color: "#C9A227", fontSize: 18, margin: "0 0 16px" }}>${(selected.price_cents / 100).toFixed(2)}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#B7BEB4" }}><Sun size={15} color="#7C9473" /> {selected.light}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#B7BEB4" }}><Droplet size={15} color="#7C9473" /> Water {selected.water.toLowerCase()}</div>
            </div>
            <button
              onClick={() => { addToCart(selected.id); setSelected(null); }}
              style={{ width: "100%", padding: "12px 0", background: "#C9A227", color: "#14201A", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: "pointer" }}
            >
              Add to cart
            </button>
          </div>
        </div>
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,15,11,0.6)", zIndex: 30 }} onClick={closeCart}>
          <div style={{
            position: "absolute", right: 0, top: 0, bottom: 0, width: 400, maxWidth: "90vw",
            background: "#1C2B22", padding: 28, overflowY: "auto", fontFamily: "system-ui, sans-serif"
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontFamily: "Georgia, serif", fontWeight: 400, fontSize: 20, color: "#EDE6D6" }}>
                {orderPlaced ? "Order confirmed" : payment ? "Payment" : checkout ? "Shipping" : "Your cart"}
              </h2>
              <button onClick={closeCart} style={{ background: "none", border: "none", color: "#9CA79A", cursor: "pointer" }}><X size={20} /></button>
            </div>

            {orderPlaced ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#2A3B2C", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <Check size={24} color="#C9A227" />
                </div>
                <p style={{ color: "#EDE6D6", fontSize: 15, marginBottom: 6 }}>Thanks, {form.name.split(" ")[0] || "friend"}.</p>
                <p style={{ color: "#9CA79A", fontSize: 14 }}>
                  Order #{orderPlaced.id} for ${(orderPlaced.total_cents / 100).toFixed(2)} is saved in the database.
                </p>
              </div>
            ) : !checkout ? (
              <>
                {cartItems.length === 0 && <p style={{ color: "#9CA79A", fontSize: 14 }}>Nothing here yet — go find something green.</p>}
                {cartItems.map((item) => (
                  <div key={item.id} style={{ display: "flex", gap: 12, padding: "14px 0", borderBottom: "1px solid #253226" }}>
                    <div style={{ fontSize: 32 }}>{item.image_emoji}</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, color: "#EDE6D6", margin: "0 0 4px" }}>{item.name}</p>
                      <p style={{ fontSize: 13, color: "#9CA79A", margin: 0 }}>${(item.price_cents / 100).toFixed(2)}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button onClick={() => changeQty(item.id, -1)} style={{ background: "#253226", border: "none", borderRadius: 6, width: 24, height: 24, color: "#EDE6D6", cursor: "pointer" }}><Minus size={12} /></button>
                      <span style={{ fontSize: 14, minWidth: 14, textAlign: "center" }}>{item.qty}</span>
                      <button onClick={() => changeQty(item.id, 1)} style={{ background: "#253226", border: "none", borderRadius: 6, width: 24, height: 24, color: "#EDE6D6", cursor: "pointer" }}><Plus size={12} /></button>
                    </div>
                  </div>
                ))}
                {cartItems.length > 0 && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "18px 0", fontSize: 15, color: "#EDE6D6" }}>
                      <span>Total</span><span>${total}</span>
                    </div>
                    <button onClick={() => setCheckout(true)} style={{ width: "100%", padding: "12px 0", background: "#C9A227", color: "#14201A", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: "pointer" }}>
                      Checkout
                    </button>
                  </>
                )}
              </>
            ) : checkout && !payment ? (
              <form onSubmit={goToPayment} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <label style={{ fontSize: 13, color: "#9CA79A" }}>Name
                  <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    style={{ width: "100%", marginTop: 6, padding: "10px 12px", background: "#14201A", border: "1px solid #3A4E3C", borderRadius: 8, color: "#EDE6D6", fontSize: 14, boxSizing: "border-box" }} />
                </label>
                <label style={{ fontSize: 13, color: "#9CA79A" }}>Email
                  <input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    style={{ width: "100%", marginTop: 6, padding: "10px 12px", background: "#14201A", border: "1px solid #3A4E3C", borderRadius: 8, color: "#EDE6D6", fontSize: 14, boxSizing: "border-box" }} />
                </label>
                <label style={{ fontSize: 13, color: "#9CA79A" }}>Delivery address
                  <textarea required rows={3} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    style={{ width: "100%", marginTop: 6, padding: "10px 12px", background: "#14201A", border: "1px solid #3A4E3C", borderRadius: 8, color: "#EDE6D6", fontSize: 14, boxSizing: "border-box", resize: "none", fontFamily: "inherit" }} />
                </label>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 15, color: "#EDE6D6" }}>
                  <span>Total</span><span>${total}</span>
                </div>
                <button type="submit" style={{ width: "100%", padding: "12px 0", background: "#C9A227", color: "#14201A", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: "pointer" }}>
                  Continue to payment
                </button>
              </form>
            ) : payment ? (
              <form onSubmit={placeOrder} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <label style={{ fontSize: 13, color: "#9CA79A" }}>Card number
                  <input required inputMode="numeric" maxLength={19} placeholder="4242 4242 4242 4242"
                    value={card.number} onChange={(e) => setCard((c) => ({ ...c, number: e.target.value }))}
                    style={{ width: "100%", marginTop: 6, padding: "10px 12px", background: "#14201A", border: "1px solid #3A4E3C", borderRadius: 8, color: "#EDE6D6", fontSize: 14, boxSizing: "border-box" }} />
                </label>
                <div style={{ display: "flex", gap: 12 }}>
                  <label style={{ fontSize: 13, color: "#9CA79A", flex: 1 }}>Expiry
                    <input required placeholder="MM/YY" value={card.expiry} onChange={(e) => setCard((c) => ({ ...c, expiry: e.target.value }))}
                      style={{ width: "100%", marginTop: 6, padding: "10px 12px", background: "#14201A", border: "1px solid #3A4E3C", borderRadius: 8, color: "#EDE6D6", fontSize: 14, boxSizing: "border-box" }} />
                  </label>
                  <label style={{ fontSize: 13, color: "#9CA79A", flex: 1 }}>CVV
                    <input required inputMode="numeric" maxLength={4} placeholder="123" value={card.cvv} onChange={(e) => setCard((c) => ({ ...c, cvv: e.target.value }))}
                      style={{ width: "100%", marginTop: 6, padding: "10px 12px", background: "#14201A", border: "1px solid #3A4E3C", borderRadius: 8, color: "#EDE6D6", fontSize: 14, boxSizing: "border-box" }} />
                  </label>
                </div>
                <p style={{ fontSize: 12, color: "#7C9473", margin: 0 }}>Placeholder payment form — no real card data is sent anywhere. Clicking "Pay" saves a real order to Postgres via the backend API.</p>
                {orderError && (
                  <p style={{ fontSize: 13, color: "#E08585", margin: 0 }}>{orderError}</p>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 15, color: "#EDE6D6" }}>
                  <span>Total</span><span>${total}</span>
                </div>
                <button type="submit" disabled={placingOrder} style={{ width: "100%", padding: "12px 0", background: "#C9A227", color: "#14201A", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: placingOrder ? "default" : "pointer", opacity: placingOrder ? 0.7 : 1 }}>
                  {placingOrder ? "Placing order…" : `Pay $${total}`}
                </button>
                <button type="button" onClick={() => setPayment(false)} style={{ width: "100%", padding: "10px 0", background: "none", border: "1px solid #3A4E3C", borderRadius: 8, color: "#9CA79A", fontSize: 14, cursor: "pointer" }}>
                  Back to shipping
                </button>
              </form>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
