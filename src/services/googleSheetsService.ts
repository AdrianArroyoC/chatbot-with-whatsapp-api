import path from 'path';
import { google } from 'googleapis';

const sheets = google.sheets('v4');

async function addRowsToSheet(auth: any, spreadsheetId: string, values: any[]) {
  const request = {
    spreadsheetId,
    range: 'Sheet1',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      values,
    },
    auth
  };

  try {
    const response = await sheets.spreadsheets.values.append(request);
    return response.data;
  } catch (error) {
    console.error('The API returned an error:', error);
  }
}

const appendToSheet = async (values: any) => {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(process.cwd(), 'src/credentials', 'credentials.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const client = await auth.getClient();
    const spreadsheetId = process.env.SPREADSHEET_ID || '';

    await addRowsToSheet(client, spreadsheetId, [values]);
  } catch (error) {
    console.error('Error appending to sheet:', error);
  }
}

export default appendToSheet;