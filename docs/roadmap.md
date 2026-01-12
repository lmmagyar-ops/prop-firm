# Project X Trading - To-Do List

## 🔴 High Priority (Pre-Launch)

### Business Registration & Integrations
- [ ] **Complete business registration** (~2 weeks)
  - [ ] Register business entity
  - [ ] Obtain EIN/Tax ID
  - [ ] Open business bank account

### Third-Party API Integrations (After Registration)
- [ ] **SumSub (KYC Verification)**
  - [ ] Create SumSub account
  - [ ] Get API keys (App Token, Secret Key)
  - [ ] Add to `.env`: `SUMSUB_APP_TOKEN`, `SUMSUB_SECRET_KEY`
  - [ ] Test KYC flow in sandbox
  - [ ] Update KYC tab to integrate SDK
  
- [ ] **Confirmo (Crypto Payments)**
  - [ ] Create Confirmo merchant account
  - [ ] Get API keys
  - [ ] Add to `.env`: `CONFIRMO_API_KEY`, `CONFIRMO_CALLBACK_PASSWORD`
  - [ ] Set up webhook handlers
  - [ ] Test crypto payouts in testnet
  
- [ ] **PayPal Business (Traditional Payments)**
  - [ ] Create PayPal Business account
  - [ ] Get OAuth credentials
  - [ ] Add to `.env`: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`
  - [ ] Configure payout settings
  - [ ] Test in sandbox
  
- [ ] **Moonpay (Optional - Alternative Crypto)**
  - [ ] Create Moonpay account
  - [ ] Get API keys
  - [ ] Add to `.env`: `MOONPAY_API_KEY`
  - [ ] Test integration

### Growth & Acquisition Systems
- [ ] **Discount Codes (Checkout Integration)**
  - [x] Backend APIs completed ✅
  - [x] Admin UI completed ✅
  - [ ] Add discount input field to checkout page
  - [ ] Integrate `/api/discount/validate` for real-time validation
  - [ ] Update price calculation display
  - [ ] Call `/api/discount/redeem` on successful purchase
  - [ ] Test discount redemption flow end-to-end

- [ ] **Affiliate Program (Portal Development)**
  - [x] Backend APIs completed ✅
  - [x] Admin UI completed ✅
  - [x] Team documentation completed ✅
  - [ ] Build affiliate portal (`/affiliate/dashboard`)
  - [ ] Add referral link copy widget
  - [ ] Create performance analytics page
  - [ ] Integrate attribution cookies during signup
  - [ ] Track commissions on purchase completion
  - [ ] Test attribution flow (click → signup → purchase)
  - [ ] Set up payout processing workflow

---

## 🟡 Medium Priority (Polish & Features)

### Dashboard & UI Enhancements
- [ ] **Implement dynamic calculations**
  - [ ] "Best Asset" calculation in Public Profile
  - [ ] `totalTrades` and `activeDays` for achievements (currently hardcoded)
  
- [ ] **Settings Page Polish**
  - [ ] Add "✓ Verified" email badge (User Info tab)
  - [ ] Add "View My Public Profile" button (User Info tab)
  - [ ] Move social media inputs to Social Media tab
  - [ ] Enhanced KYC tab with SumSub status tracker

### Activity Logging
- [ ] **Implement real-time activity tracking**
  - [ ] Log user logins to `activity_logs` table
  - [ ] Capture IP addresses and User-Agent
  - [ ] Add location detection (via IP geolocation API)
  - [ ] Display in Activity tab

### 2FA Login Flow
- [ ] **Update login to support 2FA**
  - [ ] Add 2FA code input after password verification
  - [ ] Support backup code login
  - [ ] Add "Remember this device" option

---

## 🟢 Low Priority (Future Enhancements)

### Email System
- [ ] Add email change flow (with verification)
- [ ] Implement email verification system
- [ ] Set `emailVerifiedStatus` to `true` after verification

### Payout Enhancements
- [ ] Add payout request history
- [ ] Implement payout approval workflow (admin)
- [ ] Add payout scheduling (weekly/bi-weekly/monthly)

### Security Features
- [ ] Session management (view active sessions, revoke access)
- [ ] Login notifications via email
- [ ] Suspicious activity alerts

---

## ✅ Recently Completed

- [x] Two-Factor Authentication (2FA) implementation
- [x] Database schema for security enhancements
- [x] Payouts tab UI (integration-ready)
- [x] Activity tab UI (placeholder)
- [x] Security tab with 2FA management
- [x] Migration script for new tables
- [x] API routes for 2FA (setup, verify, disable)
- [x] Trader Spotlight component
- [x] Milestone Celebrations
- [x] Quick Actions widget
- [x] Challenge Passed Modal navigation fix
- [x] Verification page placeholder

---

## 📝 Notes

### Environment Variables Needed (Post-Registration)
```bash
# SumSub
SUMSUB_APP_TOKEN=your_app_token
SUMSUB_SECRET_KEY=your_secret_key

# Confirmo
CONFIRMO_API_KEY=your_api_key
CONFIRMO_CALLBACK_PASSWORD=your_callback_password

# PayPal
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_client_secret
PAYPAL_MODE=sandbox # or 'live'

# Moonpay (Optional)
MOONPAY_API_KEY=your_api_key
```

### Integration Documentation Links
- **SumSub:** https://developers.sumsub.com/
- **Confirmo:** https://confirmo.net/documentation
- **PayPal:** https://developer.paypal.com/
- **Moonpay:** https://www.moonpay.com/developers

---

**Last Updated:** 2026-01-02
