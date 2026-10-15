# StyleHub — Fashion Mini Store

Full-stack learning project using FastAPI, SQLAlchemy ORM, SQLite, JWT, React + Vite, and Stripe test payments.

## Requirements
- Python 3.10+
- Node.js 18+
- A Stripe test-mode secret key (optional until checkout testing)

## 1. Backend setup
```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env
# Replace SECRET_KEY with a unique random value of at least 32 characters.
# For local development, generate one with:
python -c "import secrets; print(secrets.token_urlsafe(32))"
uvicorn app.main:app --reload
```
If `.env` is missing, the app will generate a development secret automatically so local startup still works; for production or shared environments, always set a strong `SECRET_KEY` in `.env`.

Open http://127.0.0.1:8000/docs

On macOS/Linux, use `cp .env.example .env` instead of `copy`.

## 2. Frontend setup
In another terminal:
```bash
cd frontend
npm install
copy .env.example .env
# Add your Stripe test publishable key to .env to enable checkout.
npm run dev
```
Open the URL Vite prints (normally http://localhost:5173).

## Demo flow
1. Register and log in.
2. Browse seeded demo products.
3. Add items to your cart and change quantities.
4. Select “Continue to payment” and complete checkout using Stripe test mode.
5. Review orders in Order History.

## Admin access
The app seeds a default admin user automatically on first backend startup:
- Email: admin@stylehub.example
- Password: Admin123!

Use the normal sign-in flow to access the admin dashboard at `/admin`, where you can review store metrics and toggle product stock.

## Stripe
Set `STRIPE_SECRET_KEY` in `backend/.env` to your Stripe **test** secret key (`sk_test_...`). The frontend uses Stripe Elements with the PaymentIntent client secret returned by the API. For local testing, use a Stripe test card such as `4242 4242 4242 4242`, a future expiry, any CVC, and any postal code.

Set `VITE_STRIPE_PUBLISHABLE_KEY` in `frontend/.env` to your Stripe **test** publishable key (`pk_test_...`). The secret key must remain in `backend/.env`.

Configure a verified webhook endpoint at `/api/orders/webhook` using the `STRIPE_WEBHOOK_SECRET` from Stripe. For local testing, use the Stripe CLI to forward `payment_intent.succeeded`, `payment_intent.payment_failed`, and `payment_intent.canceled` events to `http://127.0.0.1:8000/api/orders/webhook`, then put the CLI-provided signing secret in `backend/.env`. The frontend confirms successful payments with Stripe and the API; the signed webhook also reconciles order status if the customer closes the browser before the confirmation request completes.

## Security notes
- Passwords are hashed with bcrypt; inputs are checked against bcrypt’s 72-byte limit.
- JWTs are signed with a required, unique secret from environment variables; the API refuses to start with the example placeholder.
- Stripe keys are backend-only; never put a secret key in the frontend.
- Stripe webhook events are signature-verified before changing order state.
- API input is validated with Pydantic.
- Database access uses SQLAlchemy ORM, not raw SQL.
- This is a test-mode learning project. Add migrations, idempotency keys, rate limiting, email verification, and operational monitoring before accepting real payments.
