class ApiResponse {
    message: string
    statusCode: number
    data: any
    success: boolean
    constructor(data: any = null, message = 'Success', statusCode = 200) {
        this.message = message
        this.statusCode = statusCode
        this.data = data
        this.success = statusCode < 400
    }
}

export { ApiResponse }