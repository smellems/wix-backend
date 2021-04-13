import wixData from 'wix-data';
import wixStores from 'wix-stores-backend';
//import wixBilling from 'wix-billing-backend';
//import { invoices } from 'wix-billing-backend';
import { getSecret } from 'wix-secrets-backend';
import Iconv from 'iconv-lite';

// Test
export function wixStores_onCartCreated(event) {
    let total = event.totals.total;
    console.log("onCartCreated " + total);
}

// **** Order Paid ****/
export async function wixStores_onOrderPaid(event) {
    
    let OrderNb = event.number;

    // Logging
    console.log(event);
    
    // Copy to HTTP functions to test Dropbox XML file //

    const DropboxAccessToken = await getSecret("DropboxAccessToken");

    let options = {
        "suppressAuth": true
    };

    return wixData.query("Stores/Orders")
        .eq("number", OrderNb)
        .find(options)
        .then((results) => {
            //let order = results.items[0];


            let orderDate = new Date();
            let items = "";
            for (let i = 0; i < event.lineItems.length; i++) {
                items += "<item>" +
                    "<Itemid>" + event.lineItems[i].sku + "</Itemid>" +
                    "<Description>" + event.lineItems[i].name + "</Description>" +
                    "<Quantity>" + event.lineItems[i].quantity + "</Quantity>" +
                    "<Price>" + event.lineItems[i].priceData.totalPrice + "</Price>" +
                    "</item>";
            }

            let xmlstr = "<?xml version=\"1.0\" encoding=\"ISO-8859-1\"?>" +
                "<commande>" +
                "<TimeOrdered>" + orderDate.getHours() + ":" + orderDate.getMinutes() + ":" + orderDate.getSeconds() + "</TimeOrdered>" +
                "<DateOrdered>" + orderDate.getFullYear() + "-" + orderDate.getMonth() + "-" + orderDate.getDate() + "</DateOrdered>" +
                "<TimeDelivery>" + orderDate.getHours() + ":" + orderDate.getMinutes() + ":" + orderDate.getSeconds() + "</TimeDelivery>" +
                "<DateDelivery>" + orderDate.getFullYear() + "-" + orderDate.getMonth() + "-" + orderDate.getDate() + "</DateDelivery>" +
                "<Function>0</Function>" +
                "<SendToKitchen>0</SendToKitchen>" +
                "<CloseInvoice>0</CloseInvoice>" +
                "<NoTax>0</NoTax>" +
                "<Customer>" +
                "<Phone>" + order.buyerInfo.phone.replace(/ /gi, "").replace(/-/gi, "") + "</Phone>" +
                "<Name>" + order.buyerInfo.firstName + " " + order.buyerInfo.lastName + "</Name>" +
                "<Address>" +
                "<Number></Number>" +
                "<Street>" + order.billingInfo.address.addressLine + ((order.billingInfo.address.addressLine2 !== undefined) ? ", " + order.billingInfo.address.addressLine2 : "") + "</Street>" +
                "<AptNum></AptNum>" +
                "<Near></Near>" +
                "<CityState>" + order.billingInfo.address.city + ", " + order.billingInfo.address.subdivision + "</CityState>" +
                "<ZipCode>" + order.billingInfo.address.postalCode.replace(/ /gi, "") + "</ZipCode>" +
                "<Email>" + order.buyerInfo.email + "</Email>" +
                "</Address>" +
                "<Remark>" + ((order.buyerNote !== undefined) ? order.buyerNote : "") + "</Remark>" +
                "<Remark2/>" +
                "<Remark3/>" +
                "<Remark4/>" +
                "<Tax1/>" +
                "<Tax2/>" +
                "<Tax3/>" +
                "<Tax4/>" +
                "</Customer>" +
                "<Orders>" +
                "<Order>" +
                items +
                "<Charges>" +
                "<Service>" +
                "<Amount>" + order.totals.subtotal + "</Amount>" +
                "</Service>" +
                "<Gratuity>" +
                "<Amount>0</Amount>" +
                "</Gratuity>" +
                "<Delivery>" +
                "<Amount>" + order.totals.shipping + "</Amount>" +
                "</Delivery>" +
                "</Charges>" +
                "</Order>" +
                "</Orders>" +
                "</commande>";

            // Logging
            console.log(OrderNb + " - " + order.buyerInfo.firstName + " " + order.buyerInfo.lastName + " - " + order.totals.subtotal);

            return fetch("https://content.dropboxapi.com/2/files/upload", {
                    "method": "post",
                    "headers": {
                        "Authorization": "Bearer " + DropboxAccessToken,
                        "Content-Type": "application/octet-stream",
                        "Charset": "ISO-8859-1",
                        "Accept": "application/json",
                        "Dropbox-API-Arg": "{\"path\": \"/ORDER-" + OrderNb + ".xml\",\"mode\": \"add\",\"autorename\": false,\"mute\": true,\"strict_conflict\": false}"
                    },
                    "body": Iconv.encode(xmlstr, "ISO-8859-1")
                })
                .then((result) => {
                    console.log(result.json());
                    if (result.ok) {
                        return true;
                    } else {
                        return false;
                    }
                });

        })
        .catch((error) => {
            console.log(error);
            return false;
        });

        // End Copy
}

/**** New Order ****/
/*
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

    wixData.query("Stores/Orders")
        .include("lineItems")
        .eq("number", event.number)
        .find()
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
/*

    // Save XML order file on BEST

    return true;
}

/**** Invoice Paid ****/
/*
export function wixBilling_onInvoicePaid(event) {

    // Mark Order as paid
    wixData.query("Stores/Orders")
        .eq("number", event.title.substr(15))
        .find()
        .then((results) => {
            if (results.items.length > 0) {
                let item = results.items[0];
                item.paymentStatus = "PAID";
                wixData.update("Stores/Orders", item);
            }
        })
        .catch((err) => {
            console.log("errorMsg " + err);
        });

    // Save XML order file on BEST

}
*/
