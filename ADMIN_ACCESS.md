# Admin Panel Access

## How to Access the Admin Panel

The admin panel is now accessible via a dedicated route instead of a visible button on the main site.

### Access URL
```
https://yourdomain.com/admin
```

### Login Credentials
- **Password**: `DRB2025`

### Features
- Review and approve/reject token submissions
- View all submissions with filtering options
- Add admin notes to submissions
- 24-hour session management

### Security Notes
- The admin panel is not linked from the main site
- Only accessible via direct URL
- Session expires after 24 hours
- Password can be changed in `src/components/AdminAuth.jsx`

### For Production
Consider implementing:
- Environment variable for password
- IP whitelisting
- Rate limiting
- HTTPS enforcement 