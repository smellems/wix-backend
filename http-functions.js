import { ok, badRequest, notFound, serverError } from 'wix-http-functions';
import wixStores from 'wix-stores-backend';
import wixData from 'wix-data';

export function get_test2(request) {
    // URL looks like: https://mysite.com/_functions/test2/12345
    let response = {
        "headers": {
            "Content-Type": "application/json"
        }
    };

    return wixData.query("Stores/Products")
        .eq("sku", request.path[0])
        .find(options)
        .then((results) => {
            if (results.items.length > 0) {
                let itemData = results.items[0];

                wixStores.updateProductFields(itemData._id, {
                    "sku": itemData.sku + 1
                })

                response.body = {
                    "message": "Product has been updated"
                };
                return ok(response);
            }

            // No matching items found
            response.body = {
                "error": `'${request.path[0]}' was not found`
            };
            return notFound(response);
        })
        .catch((error) => {
            response.body = {
                "error": error
            };
            return serverError(response);
        });
}

// URL to call this HTTP function from your published site looks like: 
// Premium site - https://mysite.com/_functions/example/multiply?leftOperand=3&rightOperand=4
// Free site - https://username.wixsite.com/mysite/_functions/example/multiply?leftOperand=3&rightOperand=4

// URL to test this HTTP function from your saved site looks like:
// Premium site - https://mysite.com/_functions-dev/example/multiply?leftOperand=3&rightOperand=4
// Free site - https://username.wixsite.com/mysite/_functions-dev/example/multiply?leftOperand=3&rightOperand=4

export function get_operation(request) {
    const response = {
        "headers": {
            "Content-Type": "application/json"
        }
    };

    // Get operation from the request path
    const operation = request.path[0]; // "multiply"
    const leftOperand = parseInt(request.query["leftOperand"], 10); // 3
    const rightOperand = parseInt(request.query["rightOperand"], 10); // 4

    // Perform the requested operation and return an OK response
    // with the answer in the response body
    switch (operation) {
    case 'add':
        response.body = {
            "sum": leftOperand + rightOperand
        };
        return ok(response);
    case 'multiply':
        response.body = {
            "product": leftOperand * rightOperand
        };
        return ok(response);
    default:
        // If the requested operation was not found, return a Bad Request
        // response with an error message in the response body
        response.body = {
            "error": "unknown operation"
        };
        return badRequest(response);
    }
}
