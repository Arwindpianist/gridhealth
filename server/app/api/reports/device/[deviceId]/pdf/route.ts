import { NextRequest, NextResponse } from 'next/server'
import { generateDeviceReportPDF } from '../../../../../../lib/reportGenerator'

export async function GET(
  request: NextRequest,
  { params }: { params: { deviceId: string } }
) {
  try {
    const { deviceId } = params

    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID is required' }, { status: 400 })
    }

    // Generate PDF report
    const pdfBuffer = await generateDeviceReportPDF(deviceId)

    if (!pdfBuffer) {
      return NextResponse.json({ error: 'Failed to generate PDF report' }, { status: 500 })
    }

    // Return PDF as response
    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="device-report-${deviceId}.pdf"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    })
  } catch (error) {
    console.error('Error generating device PDF report:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
