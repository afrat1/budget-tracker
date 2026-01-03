import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'data', 'budget.json');

function readAllData() {
  try {
    const data = fs.readFileSync(dataFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

function writeAllData(data) {
  const dir = path.dirname(dataFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
}

function getEmptyMonth() {
  return {
    balance: 0,
    cash: 0,
    income: 0,
    target: 0,
    automaticPayments: [],
    creditPayments: [],
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // Format: YYYY-MM
    
    const allData = readAllData();
    
    if (month) {
      // Return data for specific month
      const monthData = allData[month] || getEmptyMonth();
      return NextResponse.json(monthData);
    }
    
    // Return all data
    return NextResponse.json(allData);
  } catch (error) {
    console.error('Error in GET /api/budget:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { month, data } = await request.json();
    
    if (!month) {
      return NextResponse.json({ error: 'Month is required' }, { status: 400 });
    }
    
    const allData = readAllData();
    allData[month] = data;
    writeAllData(allData);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/budget:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

// Copy previous month data to new month
export async function PUT(request) {
  const { fromMonth, toMonth } = await request.json();
  
  if (!fromMonth || !toMonth) {
    return NextResponse.json({ error: 'Both months are required' }, { status: 400 });
  }
  
  const allData = readAllData();
  const sourceData = allData[fromMonth];
  
  if (sourceData) {
    // Copy data but generate new IDs for payments
    allData[toMonth] = {
      balance: 0, // Start fresh with balance
      cash: 0, // Start fresh with cash
      income: sourceData.income, // Keep same income
      target: sourceData.target || 0, // Keep same target
      automaticPayments: sourceData.automaticPayments.map(p => ({
        ...p,
        id: Date.now() + Math.random() * 1000,
      })),
      creditPayments: sourceData.creditPayments.map(p => ({
        ...p,
        id: Date.now() + Math.random() * 1000,
      })),
    };
  } else {
    allData[toMonth] = getEmptyMonth();
  }
  
  writeAllData(allData);
  return NextResponse.json({ success: true, data: allData[toMonth] });
}
