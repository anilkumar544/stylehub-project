import { useCallback, useEffect, useState } from 'react';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import {
  ArrowRight,
  LogOut,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import {
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom';
import { api, getToken, money, setToken } from './api';

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

function App() {
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState({ items: [], total_cents: 0 });
  const [notice, setNotice] = useState('');

  const flash = useCallback((message) => setNotice(message), []);
  const refreshCart = useCallback(async () => {
    if (!getToken()) {
      setCart({ items: [], total_cents: 0 });
      return;
    }
    setCart(await api('/api/cart'));
  }, []);

  useEffect(() => {
    if (!getToken()) return;

    api('/api/auth/me')
      .then(setUser)
      .catch((error) => {
        setUser(null);
        flash(`Unable to restore your session: ${error.message}`);
      });

    refreshCart().catch((error) => {
      flash(`Unable to load your bag: ${error.message}`);
    });
  }, [flash, refreshCart]);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(''), 4500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const logout = () => {
    setToken(null);
    setUser(null);
    setCart({ items: [], total_cents: 0 });
    flash('You have been signed out.');
  };

  return (
    <>
      <header className="header">
        <Link to="/" className="brand" aria-label="StyleHub home">
          style<span>hub</span><i>.</i>
        </Link>
        <nav className="nav" aria-label="Main navigation">
          <Link to="/">Collection</Link>
          {user ? (
            <>
              <span className="welcome">Hi, {user.name}</span>
              <Link to="/orders">Orders</Link>
              {user.is_admin && <Link to="/admin">Admin</Link>}
              <Link to="/cart" className="cart-link">
                <ShoppingBag size={17} />
                Bag <b>{cart.items.reduce((sum, item) => sum + item.quantity, 0)}</b>
              </Link>
              <button className="text-btn" onClick={logout}>
                <LogOut size={15} /> Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Sign in</Link>
              <Link to="/cart" className="cart-link">
                <ShoppingBag size={17} /> Bag
              </Link>
              <Link to="/register" className="nav-cta">Join StyleHub</Link>
            </>
          )}
        </nav>
      </header>

      {notice && (
        <div className="notice" role="status">
          {notice}
          <button onClick={() => setNotice('')} aria-label="Dismiss notification">
            ×
          </button>
        </div>
      )}

      <Routes>
        <Route
          path="/"
          element={<Home user={user} refreshCart={refreshCart} flash={flash} />}
        />
        <Route
          path="/login"
          element={<Auth mode="login" setUser={setUser} refreshCart={refreshCart} flash={flash} />}
        />
        <Route
          path="/register"
          element={<Auth mode="register" setUser={setUser} refreshCart={refreshCart} flash={flash} />}
        />
        <Route path="/cart" element={<Cart cart={cart} refreshCart={refreshCart} flash={flash} />} />
        <Route
          path="/checkout"
          element={<Checkout cart={cart} refreshCart={refreshCart} flash={flash} />}
        />
        <Route path="/orders" element={<OrderHistory user={user} />} />
        <Route path="/admin" element={<Admin user={user} flash={flash} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <footer className="footer">
        <Link to="/" className="brand">style<span>hub</span><i>.</i></Link>
        <span>Considered pieces. Made for everyday.</span>
      </footer>
    </>
  );
}

function Home({ user, refreshCart, flash }) {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const categories = ['All', ...new Set(products.map((product) => product.category))];
  const filteredProducts = category === 'All'
    ? products
    : products.filter((product) => product.category === category);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());

    setLoading(true);
    setError('');
    api(`/api/products?${params}`)
      .then(setProducts)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [search]);

  const addToCart = async (product) => {
    if (!user) {
      flash('Sign in to add items to your bag.');
      navigate('/login');
      return;
    }
    try {
      await api('/api/cart/items', {
        method: 'POST',
        body: JSON.stringify({ product_id: product.id, quantity: 1 }),
      });
      await refreshCart();
      flash(`${product.name} added to your bag.`);
    } catch (requestError) {
      flash(requestError.message);
    }
  };

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">A MORE CONSIDERED WARDROBE</span>
          <h1>Wear what<br />feels <em>like you.</em></h1>
          <p>Everyday pieces, thoughtfully chosen. Find your new favorites in the StyleHub collection.</p>
          <a className="button dark" href="#collection">
            Explore the collection <ArrowRight size={17} />
          </a>
        </div>
        <div className="hero-art">
          <img
            src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1000&q=85"
            alt="A curated selection of contemporary fashion"
          />
          <span className="hero-sun" />
          <div className="hero-note">A LITTLE MORE YOU <span>✳</span></div>
        </div>
        <span className="hero-index">01 — STYLEHUB COLLECTION</span>
      </section>

      <section className="collection" id="collection">
        <div className="section-head">
          <div>
            <span className="eyebrow">THE GOOD THINGS</span>
            <h2>Find your feeling</h2>
          </div>
          <label className="searchbox">
            <Search size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search the collection"
              aria-label="Search products"
            />
          </label>
        </div>
        <div className="filters" aria-label="Filter products by category">
          {categories.map((item) => (
            <button
              key={item}
              className={`filter${category === item ? ' active' : ''}`}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
        {error && <p className="error">{error}</p>}
        {loading ? (
          <p className="loading">Finding your favorites...</p>
        ) : filteredProducts.length ? (
          <div className="product-grid">
            {filteredProducts.map((product) => (
              <article className="product" key={product.id}>
                <div className="product-image">
                  <img src={product.image_url} alt={product.name} />
                  <span className="product-tag">{product.category}</span>
                  <button
                    className="add-button"
                    onClick={() => addToCart(product)}
                    aria-label={`Add ${product.name} to bag`}
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <div className="product-info">
                  <div><h3>{product.name}</h3><p>{product.category}</p></div>
                  <strong>{money(product.price_cents)}</strong>
                </div>
                <p className="product-description">{product.description}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty"><h3>No pieces found</h3><p>Try another search or category.</p></div>
        )}
      </section>
      <section className="promise">
        <span>✳</span><p>Good style is less about more.<br /><em>It’s about finding your more.</em></p><span>✳</span>
      </section>
    </>
  );
}

function Auth({ mode, setUser, refreshCart, flash }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const isRegister = mode === 'register';

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await api(`/api/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify(
          isRegister ? { name: name.trim(), email, password } : { email, password }
        ),
      });
      setToken(result.access_token);
      setUser(result.user);
      await refreshCart();
      flash(`Welcome${result.user.name ? `, ${result.user.name}` : ''}!`);
      navigate('/');
    } catch (requestError) {
      setError(requestError.message || 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-layout">
      <div className="auth-photo">
        <img
          src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1100&q=85"
          alt="Carefully selected wardrobe essentials"
        />
        <div>
          <span>STYLEHUB — THE EVERYDAY EDIT</span>
          <h2>Make room<br />for <em>you.</em></h2>
        </div>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <span className="eyebrow">{isRegister ? 'YOUR NEXT CHAPTER' : 'WELCOME BACK'}</span>
        <h1>{isRegister ? 'Create an account' : 'Sign in'}</h1>
        <p>
          {isRegister
            ? 'Join us for thoughtful finds and pieces you’ll reach for every day.'
            : 'Good to see you again. Sign in to continue to your collection.'}
        </p>
        {error && <p className="error" role="alert">{error}</p>}
        {isRegister && (
          <label>
            Your name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              minLength={2}
              maxLength={100}
              required
            />
          </label>
        )}
        <label>
          Email address
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            minLength={isRegister ? 8 : 1}
            maxLength={128}
            required
          />
        </label>
        <button className="button dark full" type="submit" disabled={loading}>
          {loading ? 'Please wait...' : isRegister ? 'Create account' : 'Sign in'}
          {!loading && <ArrowRight size={17} />}
        </button>
        <p className="auth-switch">
          {isRegister ? 'Already have an account?' : 'New to StyleHub?'}{' '}
          <Link to={isRegister ? '/login' : '/register'}>
            {isRegister ? 'Sign in' : 'Create an account'}
          </Link>
        </p>
      </form>
    </main>
  );
}

function OrderHistory({ user }) {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api('/api/orders')
      .then(setOrders)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return <section className="page empty"><h2>Sign in to view your orders</h2><Link to="/login">Sign in</Link></section>;
  }
  return (
    <section className="page">
      <span className="eyebrow">YOUR STYLEHUB</span>
      <h1>Order history</h1>
      {error && <p className="error">{error}</p>}
      {loading ? <p className="loading">Loading your orders...</p> : orders.length ? (
        <div className="cart-items">
          {orders.map((order) => (
            <article className="cart-item" key={order.id}>
              <div className="cart-item-info">
                <h3>Order #{order.id}</h3>
                <p>{new Date(order.created_at).toLocaleDateString()} · {order.status}</p>
                <strong>{money(order.total_cents)}</strong>
                <p>{order.items.map((item) => `${item.product_name} × ${item.quantity}`).join(', ')}</p>
              </div>
            </article>
          ))}
        </div>
      ) : <div className="empty"><h2>No orders yet</h2><p>Your next favorite is waiting to be found.</p><Link className="button dark" to="/">Explore collection</Link></div>}
    </section>
  );
}

function Admin({ user, flash }) {
  const [summary, setSummary] = useState(null);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.is_admin) return;
    Promise.all([api('/api/admin/summary'), api('/api/admin/products')])
      .then(([adminSummary, adminProducts]) => {
        setSummary(adminSummary);
        setProducts(adminProducts);
      })
      .catch((requestError) => setError(requestError.message));
  }, [user]);

  const toggleStock = async (product) => {
    try {
      const updated = await api(`/api/admin/products/${product.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ in_stock: !product.in_stock }),
      });
      setProducts((current) => current.map((item) => item.id === updated.id ? updated : item));
      flash(`${updated.name} stock status updated.`);
    } catch (requestError) {
      flash(requestError.message);
    }
  };

  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_admin) return <section className="page"><p className="error">You do not have access to the admin dashboard.</p></section>;
  return (
    <section className="page">
      <span className="eyebrow">STORE OVERVIEW</span>
      <h1>Admin dashboard</h1>
      {error && <p className="error">{error}</p>}
      {summary && <p>{summary.stats.products} products · {summary.stats.orders} orders · {summary.stats.paid_orders} paid</p>}
      <div className="cart-items">
        {products.map((product) => (
          <article className="cart-item" key={product.id}>
            <div className="cart-item-info"><h3>{product.name}</h3><p>{product.category} · {money(product.price_cents)}</p></div>
            <button className="button dark" onClick={() => toggleStock(product)}>
              {product.in_stock ? 'Mark out of stock' : 'Mark in stock'}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function Cart({ cart, refreshCart, flash }) {
  const update = async (item, quantity) => {
    try {
      if (quantity < 1) {
        await api(`/api/cart/items/${item.id}`, {
          method: 'DELETE',
        });
      } else {
        await api(`/api/cart/items/${item.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ quantity }),
        });
      }

      await refreshCart();
    } catch (e) {
      flash(e.message);
    }
  };

  return (
    <section className="page">
      <span className="eyebrow">YOUR SELECTION</span>
      <h1>
        Your bag <span className="muted">({cart.items.length} items)</span>
      </h1>

      {!cart.items.length ? (
        <div className="empty">
          <ShoppingBag size={36} />
          <h2>Your bag is waiting</h2>
          <p>Find something that feels like you.</p>
          <Link to="/" className="button dark">
            Explore collection <ArrowRight size={17} />
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items">
            {cart.items.map((item) => (
              <article className="cart-item" key={item.id}>
                <img
                  src={item.product.image_url}
                  alt={item.product.name}
                />

                <div className="cart-item-info">
                  <h3>{item.product.name}</h3>
                  <p>{item.product.category}</p>
                  <strong>{money(item.product.price_cents)}</strong>

                  <div className="quantity">
                    <button
                      onClick={() => update(item, item.quantity - 1)}
                      aria-label="Decrease quantity"
                    >
                      <Minus size={14} />
                    </button>

                    <span>{item.quantity}</span>

                    <button
                      onClick={() => update(item, item.quantity + 1)}
                      disabled={item.quantity >= 20}
                      aria-label="Increase quantity"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                <button
                  className="icon-btn remove"
                  onClick={() => update(item, 0)}
                  aria-label="Remove item"
                >
                  <Trash2 size={18} />
                </button>
              </article>
            ))}
          </div>

          <aside className="summary">
            <h2>Order summary</h2>

            <div>
              <span>Subtotal</span>
              <strong>{money(cart.total_cents)}</strong>
            </div>

            <div>
              <span>Shipping</span>
              <span>Calculated at checkout</span>
            </div>

            <div className="summary-total">
              <span>Total</span>
              <strong>{money(cart.total_cents)}</strong>
            </div>

            <Link to="/checkout" className="button dark full">
              Continue to checkout <ArrowRight size={17} />
            </Link>

            <p className="secure-note">
              Secure checkout · Stripe test mode
            </p>
          </aside>
        </div>
      )}
    </section>
  );
}

function Checkout({ cart, refreshCart, flash }) {
  const [checkout, setCheckout] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const startCheckout = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await api('/api/orders/checkout', { method: 'POST' });

      if (!data.client_secret) {
        throw new Error(
          'The backend did not return a Stripe client secret.'
        );
      }

      setCheckout(data);
    } catch (e) {
      setError(e.message || 'Unable to start checkout.');
    } finally {
      setLoading(false);
    }
  };

  const paymentSucceeded = async () => {
    await api(`/api/orders/${checkout.order_id}/confirm`, { method: 'POST' });
    await refreshCart();
    flash('Payment completed. Check your order history.');
    navigate('/orders');
  };

  if (!cart?.items?.length) {
    return (
      <section className="empty">
        <h2>Your bag is empty</h2>
        <Link to="/">Continue shopping</Link>
      </section>
    );
  }

  if (!stripePromise) {
    return (
      <section className="page checkout-page">
        <h1>Checkout</h1>
        <p className="error">
          Stripe is not configured. Check your frontend .env file.
        </p>
      </section>
    );
  }

  return (
    <section className="page checkout-page">
      <h1>Checkout</h1>
      <p>Order total: {money(cart.total_cents)}</p>

      {error && <p className="error">{error}</p>}

      {!checkout ? (
        <button
          className="button dark"
          onClick={startCheckout}
          disabled={loading}
        >
          {loading ? 'Preparing checkout...' : 'Continue to payment'}
        </button>
      ) : (
        <Elements
          stripe={stripePromise}
          options={{ clientSecret: checkout.client_secret }}
        >
          <PaymentForm
            checkout={checkout}
            onSuccess={paymentSucceeded}
            onError={setError}
          />
        </Elements>
      )}
    </section>
  );
}

function PaymentForm({ checkout, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (!stripe || !elements || !checkout?.client_secret) {
      setError('Payment is not ready. Please try again.');
      return;
    }

    setBusy(true);

    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/orders`,
        },
        redirect: 'if_required',
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      if (result.paymentIntent?.status === 'succeeded') {
        await onSuccess?.(result.paymentIntent);
      } else {
        setError(
          'Payment is not confirmed yet. Please check your order.'
        );
      }
    } catch (e) {
      const message = e.message || 'Payment failed.';
      setError(message);
      onError?.(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="payment-form">
      <h2>Payment</h2>

      {error && <p className="error">{error}</p>}

      <PaymentElement />

      <button
        className="button dark full"
        type="submit"
        disabled={!stripe || !elements || busy}
      >
        {busy ? 'Processing...' : 'Pay now'}
      </button>
    </form>
  );
}
export default App;