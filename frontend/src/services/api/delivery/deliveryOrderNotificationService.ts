import { Socket } from 'socket.io-client';

export interface OrderNotificationData {
    orderId: string;
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    deliveryAddress: {
        address: string;
        city: string;
        state?: string;
        pincode: string;
        landmark?: string;
    };
    total: number;
    subtotal: number;
    shipping: number;
    expectedEarning?: number;
    createdAt: string;
    type?: 'ORDER' | 'RETURN';
}

export interface ReturnNotificationData {
    returnId: string;
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    deliveryAddress: {
        address: string;
        city: string;
        state?: string;
        pincode: string;
    };
    productName: string;
    variation: string;
    quantity: number;
    reason: string;
    description: string;
    images: string[];
    expectedEarning: number;
    createdAt: string;
    type?: 'RETURN';
}

export interface AcceptOrderResponse {
    success: boolean;
    message: string;
}

export interface RejectOrderResponse {
    success: boolean;
    message: string;
    allRejected: boolean;
}

/**
 * Accept an order via WebSocket
 */
export const acceptOrder = (
    socket: Socket,
    orderId: string,
    deliveryBoyId: string
): Promise<AcceptOrderResponse> => {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            resolve({
                success: false,
                message: 'Request timeout',
            });
        }, 10000); // 10 second timeout

        socket.emit('accept-order', { orderId, deliveryBoyId });

        socket.once('accept-order-response', (response: AcceptOrderResponse) => {
            clearTimeout(timeout);
            resolve(response);
        });
    });
};

/**
 * Reject an order via WebSocket
 */
export const rejectOrder = (
    socket: Socket,
    orderId: string,
    deliveryBoyId: string
): Promise<RejectOrderResponse> => {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            resolve({
                success: false,
                message: 'Request timeout',
                allRejected: false,
            });
        }, 10000); // 10 second timeout

        socket.emit('reject-order', { orderId, deliveryBoyId });

        socket.once('reject-order-response', (response: RejectOrderResponse) => {
            clearTimeout(timeout);
            resolve(response);
        });
    });
};

/**
 * Accept a return pickup via WebSocket
 */
export const acceptReturnPickupSocket = (
    socket: Socket,
    returnId: string,
    deliveryBoyId: string
): Promise<AcceptOrderResponse> => {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            resolve({
                success: false,
                message: 'Request timeout',
            });
        }, 10000);

        socket.emit('accept-return-pickup', { returnId, deliveryBoyId });

        socket.once('accept-return-pickup-response', (response: AcceptOrderResponse) => {
            clearTimeout(timeout);
            resolve(response);
        });
    });
};

/**
 * Reject a return pickup via WebSocket
 */
export const rejectReturnPickupSocket = (
    socket: Socket,
    returnId: string,
    deliveryBoyId: string
): Promise<RejectOrderResponse> => {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            resolve({
                success: false,
                message: 'Request timeout',
                allRejected: false,
            });
        }, 10000);

        socket.emit('reject-return-pickup', { returnId, deliveryBoyId });

        socket.once('reject-return-pickup-response', (response: RejectOrderResponse) => {
            clearTimeout(timeout);
            resolve(response);
        });
    });
};

