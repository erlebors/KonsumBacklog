# OrganAIze

A web application for organizing tips, links, LinkedIn posts, and other useful information with AI-powered categorization and smart notifications.

## Features

- **Quick Input**: Save tips with minimal effort - just content, URL, and relevance information
- **AI Organization**: Automatic categorization and tagging using OpenAI
- **Smart Notifications**: Get notified about tips that are relevant soon
- **Easy Review**: Filter and review tips by urgency, category, or processing status
- **Clean Interface**: Simple, intuitive design focused on quick actions

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure OpenAI** (Optional)
   
   Create a `.env.local` file in the root directory with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

   If you don't configure OpenAI, the app will still work but without AI categorization.

3. **Run the Development Server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### Adding a New Tip
1. Click "New Tip" on the main page
2. Enter content, URL, or both
3. Optionally set a relevance date and event
4. Click "Save Tip"

### Reviewing Tips
1. Click "Review Later" on the main page
2. Use filters to view tips by urgency or status
3. Mark tips as processed or delete them
4. View AI-generated categories and summaries

### Notifications
- The app automatically checks for tips that are relevant within 7 days
- Urgent tips (within 3 days) are highlighted in red
- A notification badge shows the count of urgent tips

## Data Storage

This demo uses local file storage (`data/tips.json`). In production, you should:
- Use a proper database (PostgreSQL, MongoDB, etc.)
- Implement user authentication
- Add data backup and recovery

## Technologies Used

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **AI**: OpenAI GPT-3.5 Turbo
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Date Handling**: date-fns

## API Endpoints

- `GET /api/tips` - Get all tips
- `POST /api/tips` - Create a new tip
- `PATCH /api/tips/[id]` - Update a tip
- `DELETE /api/tips/[id]` - Delete a tip
- `GET /api/notifications` - Get urgent notifications

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License
