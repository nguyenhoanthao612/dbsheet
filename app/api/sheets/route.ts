import { NextRequest, NextResponse } from 'next/server';

// Get the Google Sheets Apps Script URL from environment or fallback
const getAppsScriptUrl = () => {
  return process.env.GOOGLE_SHEET_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbxg1_yqPFYxcszhRpu_nqNZtDnmhpHR-cM0t65s1kjI6MYxwNa4yg12WyTagF4zDdFr/exec';
};

const isValidUrl = (url: string | null): boolean => {
  if (!url) return false;
  const trimmed = url.trim();
  if (trimmed.includes('...') || !trimmed.startsWith('http')) return false;
  return true;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const sheetName = searchParams.get('sheetName') || searchParams.get('sheet');
  const customUrl = searchParams.get('customUrl');

  const appsScriptUrl = customUrl || getAppsScriptUrl();

  if (!isValidUrl(appsScriptUrl)) {
    return NextResponse.json({ 
      error: 'NOT_CONFIGURED',
      message: 'Google Sheets API URL is not configured. Please set GOOGLE_SHEET_APPS_SCRIPT_URL in your .env or configure it in the Admin Dashboard.' 
    }, { status: 200 });
  }

  try {
    let url = `${appsScriptUrl.trim()}?action=${action}`;
    if (sheetName) {
      url += `&sheetName=${encodeURIComponent(sheetName)}`;
    }

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 0 } // Disable caching to fetch real-time data
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();

    if (!contentType.includes('application/json') && (text.trim().startsWith('<') || text.trim().startsWith('<!'))) {
      return NextResponse.json({
        error: 'HTML_RESPONSE',
        message: 'The Google Sheets API returned HTML instead of JSON. This usually indicates an authentication redirect or server error. Please check that your Google Apps Script is deployed as "Anyone" and the URL is correct.'
      }, { status: 200 });
    }

    try {
      const data = JSON.parse(text);
      return NextResponse.json(data);
    } catch (e) {
      return NextResponse.json({
        error: 'INVALID_JSON',
        message: 'Failed to parse JSON response from Google Sheets API. The script might have returned an error page.',
        details: text.slice(0, 500)
      }, { status: 200 });
    }
  } catch (error: any) {
    console.warn('Error fetching from Google Sheets:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch from Google Sheets' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customUrl = searchParams.get('customUrl');
    const body = await req.json();
    
    const appsScriptUrl = customUrl || getAppsScriptUrl();

    if (!isValidUrl(appsScriptUrl)) {
      return NextResponse.json({ 
        error: 'NOT_CONFIGURED',
        message: 'Google Sheets API URL is not configured.' 
      }, { status: 200 });
    }

    // Forward search parameters (e.g., ?action=updateExam) to Google Apps Script for maximum compatibility
    let targetUrl = appsScriptUrl.trim();
    const queryParams = new URLSearchParams();
    searchParams.forEach((value, key) => {
      if (key !== 'customUrl') {
        queryParams.set(key, value);
      }
    });

    // Ensure action is included in the query parameters
    if (body && body.action && !queryParams.has('action')) {
      queryParams.set('action', body.action);
    }

    const queryStr = queryParams.toString();
    if (queryStr) {
      targetUrl += (targetUrl.includes('?') ? '&' : '?') + queryStr;
    }

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(body),
      redirect: 'follow'
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();

    if (!contentType.includes('application/json') && (text.trim().startsWith('<') || text.trim().startsWith('<!'))) {
      return NextResponse.json({
        error: 'HTML_RESPONSE',
        message: 'The Google Sheets API returned HTML instead of JSON. This usually indicates an authentication redirect or server error. Please check that your Google Apps Script is deployed as "Anyone" and the URL is correct.'
      }, { status: 200 });
    }

    try {
      const data = JSON.parse(text);
      return NextResponse.json(data);
    } catch (e) {
      return NextResponse.json({
        error: 'INVALID_JSON',
        message: 'Failed to parse JSON response from Google Sheets API. The script might have returned an error page.',
        details: text.slice(0, 500)
      }, { status: 200 });
    }
  } catch (error: any) {
    console.warn('Error posting to Google Sheets:', error);
    return NextResponse.json({ error: error.message || 'Failed to post to Google Sheets' }, { status: 500 });
  }
}
