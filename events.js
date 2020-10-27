import wixData from 'wix-data';
import wixStores from 'wix-stores-backend';
import wixBilling from 'wix-billing-backend';
import { invoices } from 'wix-billing-backend';

// Test
export function wixStores_onCartCreated(event) {
    let total = event.totals.total;
    console.log("onCartCreated " + total);
}

/**** New Order ****/
export function wixStores_onNewOrder(event) {

    const now = new Date()

    // Create Invoice for Order
    let customer = {
        "contactId": event.buyerInfo.id,
        "email": event.buyerInfo.email,
        "phone": event.buyerInfo.phone,
        "firstName": event.buyerInfo.firstName,
        "lastName": event.buyerInfo.lastName
    };

    let lineItems = [];
    let bulk = false;

    let options = {
        "suppressAuth": true
    };

    wixData.query("Stores/Orders")
        .include("lineItems")
        .eq("number", event.number)
        .find(options)
        .then((results) => {
            if (results.items.length > 0) {
                let orderData = results.items[0];
                console.log("orderData " + orderData.lineItems[0]);

                for (let lineItem in orderData.lineItems) {

                    let descriptionOptions = "";
                    for (let option in lineItem.options) {
                        descriptionOptions = descriptionOptions + option.option + ":" + option.seclection + "  ";
                    }

                    lineItems = lineItems + {
                        "id": lineItem.index,
                        "name": lineItem.name + " - " + lineItem.translatedName,
                        "description": descriptionOptions,
                        "price": lineItem.priceData.price,
                        "quantity": lineItem.quantity
                    };
                }
            }
        })
        .catch((err) => {
            console.log("errorMsg " + err);
        });

    const payments = [{
        "id": "00001",
        "type": "Offline",
        "amount": event.totals.total,
        "date": now.getDate()
    }];

    let dates = {
        "issueDate": now.getDate(),
        "dueDate": now.getDate()
    };

    let newInvoiceFields = {
        "title": "Commande Web - " + event.number,
        "customer": customer,
        "currency": "CAD",
        "lineItems": lineItems,
        "payments": payments,
        "dates": dates
    };

    let newInvoiceId = invoices.createInvoice(newInvoiceFields);

    // Send Invoice by email if does'nt have bulk items
    /*if (!bulk && event.paymentStatus == "NOT_PAID") {
      invoices.sendInvoice(newInvoiceId, event.buyerInfo.email);
    }*/

    // Save XML order file

    return true;
}

/**** Invoice Paid ****/
export function wixBilling_onInvoicePaid(event) {

    // Mark Order as paid
    let options = {
        "suppressAuth": true
    };

    wixData.query("Stores/Orders")
        .eq("number", event.title.substr(15))
        .find(options)
        .then((results) => {
            if (results.items.length > 0) {
                let item = results.items[0];
                item.paymentStatus = "PAID";
                wixData.update("Stores/Orders", item, options);
            }
        })
        .catch((err) => {
            console.log("errorMsg " + err);
        });

}
