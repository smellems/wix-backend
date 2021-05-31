import wixData from 'wix-data';
import { fetch } from 'wix-fetch';
import { getSecret } from 'wix-secrets-backend';
import Iconv from 'iconv-lite';

// Test
export function wixStores_onCartCreated(event) {
    let total = event.totals.total;
    console.log("onCartCreated " + total);
}

// **** Order Paid ****/
export async function wixStores_onOrderPaid(event) {

    // Logging
    wixData.insert("onOrderPaidEvent", event);
    console.log(event);

    const DropboxAccessToken = await getSecret("DropboxAccessToken");

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
                "<Phone>" + event.buyerInfo.phone.replace(/ /gi, "").replace(/-/gi, "") + "</Phone>" +
                "<Name>" + event.buyerInfo.firstName + " " + event.buyerInfo.lastName + "</Name>" +
                "<Address>" +
                    "<Number></Number>" +
                    "<Street>" + event.billingInfo.address.addressLine + ((event.billingInfo.address.addressLine2 !== undefined) ? ", " + event.billingInfo.address.addressLine2 : "") + "</Street>" +
                    "<AptNum></AptNum>" +
                    "<Near></Near>" +
                    "<CityState>" + event.billingInfo.address.city + ", " + event.billingInfo.address.subdivision + "</CityState>" +
                    "<ZipCode>" + event.billingInfo.address.postalCode.replace(/ /gi, "") + "</ZipCode>" +
                    "<Email>" + event.buyerInfo.email + "</Email>" +
                "</Address>" +
                "<Remark>" + ((event.buyerNote !== undefined) ? event.buyerNote : "") + "</Remark>" +
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
                    "<Amount>" + event.totals.subtotal + "</Amount>" +
                    "</Service>" +
                    "<Gratuity>" +
                    "<Amount>0</Amount>" +
                    "</Gratuity>" +
                    "<Delivery>" +
                    "<Amount>" + event.totals.shipping + "</Amount>" +
                    "</Delivery>" +
                    "</Charges>" +
                "</Order>" +
            "</Orders>" +
        "</commande>";

    return fetch("https://content.dropboxapi.com/2/files/upload", {
            "method": "post",
            "headers": {
                "Authorization": "Bearer " + DropboxAccessToken,
                "Content-Type": "application/octet-stream",
                "Charset": "ISO-8859-1",
                "Accept": "application/json",
                "Dropbox-API-Arg": "{\"path\": \"/ORDER-" + event.number + ".xml\",\"mode\": \"add\",\"autorename\": false,\"mute\": true,\"strict_conflict\": false}"
            },
            "body": Iconv.encode(xmlstr, "ISO-8859-1")
        })
        .then((result) => {
            wixData.insert("onOrderPaidEvent", result.json());
            console.log(result.json());
            if (result.ok) {
                return true;
            } else {
                return false;
            }
        });
}