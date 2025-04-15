import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Request, Response } from 'express';
import { envs, NATS_SERVICE } from 'src/config';
import { PaymentSessionDto } from 'src/dto/payment-session.dto';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private readonly stripe = new Stripe(envs.stripe_secret);
  private readonly logger = new Logger('PaymentsService');

  constructor(@Inject(NATS_SERVICE) private readonly client: ClientProxy) {}

  async createPaymentSession(paymentSessionDto: PaymentSessionDto) {
    const { currency, items, orderId } = paymentSessionDto;

    const lineItems = items.map((item) => {
      return {
        price_data: {
          currency: currency,
          product_data: {
            name: item.name,
          },
          unit_amount: Math.round(item.price * 100), //20 dolares
        },
        quantity: item.quantity,
      };
    });

    const session = await this.stripe.checkout.sessions.create({
      // Colocar aqui el id de mi orden
      payment_intent_data: {
        metadata: {
          orderId,
        },
      },
      line_items: lineItems,
      mode: 'payment',
      success_url: envs.success_url,
      cancel_url: envs.cancel_url,
    });

    return {
      cancelUrl: session.cancel_url,
      successUrl: session.success_url,
      url: session.url,
    };
  }

  stripeWebhook(request: Request, response: Response) {
    const sig = request.headers['stripe-signature'];
    const endpointSecret = envs.endpoint_secret;
    let event: Stripe.Event;

    if (!sig) {
      response
        .status(400)
        .send('Webhook Error: Missing stripe-signature header');
      return;
    }

    try {
      event = this.stripe.webhooks.constructEvent(
        request['rawBody'] as string | Buffer,
        sig,
        endpointSecret,
      );
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      response.status(400).send(`Webhook Error: ${error.message}`);
      return;
    }
    console.log(event.type, 'tipo');
    switch (event.type) {
      case 'charge.succeeded': {
        const chargeSucceded = event.data.object;
        const payload = {
          stripePaymentId: chargeSucceded.id,
          orderId: chargeSucceded.metadata.orderId,
          receiptUrl: chargeSucceded.receipt_url,
        };

        this.client.emit('payment.succeeded', payload);
        break;
      }
      default:
        console.log('Event not handle');
    }

    return sig;
  }
}
