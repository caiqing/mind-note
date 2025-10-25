import { NextResponse } from 'next/server'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
  timestamp?: string
}

export class ApiError extends Error {
  statusCode: number
  code?: string

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message)
    this.statusCode = statusCode
    this.code = code
  }
}

export function createSuccessResponse<T>(
  data: T,
  message?: string,
  statusCode: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  )
}

export function createErrorResponse(
  message: string,
  statusCode: number = 500,
  code?: string
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  )
}

export function handleApiError(error: unknown): NextResponse<ApiResponse> {
  console.error('API Error:', error)

  if (error instanceof ApiError) {
    return createErrorResponse(error.message, error.statusCode, error.code)
  }

  if (error instanceof Error) {
    return createErrorResponse(error.message, 500, 'INTERNAL_ERROR')
  }

  return createErrorResponse('An unexpected error occurred', 500, 'UNKNOWN_ERROR')
}

export function validateRequiredFields<T extends Record<string, any>>(
  data: any,
  requiredFields: (keyof T)[]
): { isValid: boolean; missingFields: string[] } {
  const missingFields: string[] = []

  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missingFields.push(String(field))
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  }
}