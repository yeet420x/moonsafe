# MoonSafe Meter Submission System

This document explains how to set up and use the token submission system for the MoonSafe Meter.

## Overview

The submission system allows users to submit tokens for community review. All submissions require admin approval before they appear on the website. The system includes:

- **User Submission Form**: A modal form where users can submit tokens
- **Admin Panel**: A management interface for reviewing and approving/rejecting submissions
- **Database Integration**: Supabase backend for storing and managing submissions

## Setup Instructions

### 1. Database Setup

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `database_setup.sql`
4. Run the script to create the necessary table and policies

### 2. Environment Variables

Make sure your `.env` file contains the necessary Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Row Level Security (RLS)

The system uses RLS policies to control access:
- Anyone can submit tokens (INSERT)
- Only approved tokens are publicly visible (SELECT with status = 'approved')
- Authenticated users can read all submissions and update status (for admin panel)

## How It Works

### User Submission Process

1. Users click the "🚀 Submit Token" button in the MoonSafe Meter section
2. A modal form opens with fields for:
   - Token Name
   - Token Address
   - Submitter Name
   - Submitter Telegram or Discord (required)
   - Description
   - Token Social Links (required - must include X or Telegram)
3. Users fill out the form and submit
4. The submission is stored in the database with status 'pending'
5. Users receive a success message

### Admin Review Process

1. Admins access the admin panel via the "🔧 Admin Panel" button (top-right corner)
2. The admin panel shows all submissions with filtering options:
   - Pending Review
   - Approved
   - Rejected
   - All Submissions
3. For pending submissions, admins can:
   - Add admin notes
   - Approve the submission
   - Reject the submission
4. Status changes are recorded with timestamps

## Features

### User Features
- **Easy Submission**: Simple form with validation
- **Real-time Feedback**: Success/error messages
- **Submission Guidelines**: Clear instructions for users
- **Required Contact**: Users must provide Telegram or Discord contact
- **Social Link Validation**: Tokens must have X or Telegram links

### Admin Features
- **Comprehensive Dashboard**: View all submissions with filtering
- **Status Management**: Approve/reject submissions with notes
- **Detailed Information**: View all submission details
- **Timestamp Tracking**: See when submissions were created and reviewed

### Security Features
- **Duplicate Prevention**: Checks for existing token submissions
- **Input Validation**: Form validation on both client and server
- **RLS Policies**: Database-level security controls
- **Status Control**: Only approved submissions are publicly visible

## Database Schema

### token_submissions Table

| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| token_name | VARCHAR(255) | Name of the token |
| token_address | VARCHAR(255) | Contract address |
| submitter_name | VARCHAR(255) | Name of person submitting |
| submitter_contact | VARCHAR(255) | Telegram or Discord contact (required) |
| description | TEXT | Detailed description |
| social_links | TEXT | Social media links (required - must include X or Telegram) |
| status | VARCHAR(50) | 'pending', 'approved', or 'rejected' |
| admin_notes | TEXT | Notes from admin review |
| created_at | TIMESTAMP | When submitted |
| reviewed_at | TIMESTAMP | When reviewed |
| updated_at | TIMESTAMP | Last update |

## Customization

### Styling
- All components use CSS modules
- Colors and styling match the MoonSafe theme
- Responsive design for mobile devices

### Form Fields
You can easily add or modify form fields by:
1. Updating the form state in `TokenSubmissionForm.jsx`
2. Adding the field to the database schema
3. Updating the submission function in `supabase.js`

### Admin Access
Currently, admin access is controlled by a simple toggle button. For production:
1. Implement proper authentication
2. Add role-based access control
3. Secure the admin panel with login requirements

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check your Supabase credentials
   - Verify the table exists
   - Check RLS policies

2. **Submissions Not Saving**
   - Check browser console for errors
   - Verify form validation
   - Check database permissions

3. **Admin Panel Not Loading**
   - Check authentication status
   - Verify RLS policies for authenticated users
   - Check network connectivity

### Debug Mode

Enable console logging by checking the browser console for detailed error messages and API responses.

## Future Enhancements

Potential improvements for the submission system:

1. **Email Notifications**: Send emails when submissions are approved/rejected
2. **Image Uploads**: Allow users to upload token logos or screenshots
3. **Advanced Filtering**: More sophisticated search and filter options
4. **Bulk Operations**: Approve/reject multiple submissions at once
5. **Analytics**: Track submission statistics and trends
6. **Moderation Queue**: Priority system for urgent submissions
7. **Community Voting**: Allow community members to vote on submissions

## Support

For issues or questions about the submission system:
1. Check the browser console for error messages
2. Verify database setup and permissions
3. Test with the sample data provided in the SQL script
4. Review the component files for implementation details 