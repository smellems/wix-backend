import { ok, serverError } from 'wix-http-functions';
import { getSecret } from 'wix-secrets-backend';
import wixStores from 'wix-stores-backend';
import wixData from 'wix-data';

export function updateVariants(product, choiceNb, available, newPrice) {

    let variantInfo = {
        trackQuantity: false,
        variants: [{
            variantId: product.variants[choiceNb]._id,
            inStock: available
        }]
    };

    wixStores.updateInventoryVariantFieldsByProductId(product._id, variantInfo)
        .then(() => {

            const choice = product.variants[choiceNb].choices.Grandeur;
            const price = (newPrice * product.productOptions.Grandeur.choices[choiceNb].value / 1000).toFixed(2);
            const visible = available;
            let variantData = [{
                visible,
                price,
                "choices": {
                    "Grandeur": choice
                }
            }];

            wixStores.updateVariantData(product._id, variantData);
        });
}

export async function post_updateProduct(request) {

    const BestPosApiKey = await getSecret("BestPosApiKey");

    let response = {
        "headers": {
            "Content-Type": "application/json"
        }
    };

    // get the request body
    return request.body.json()
        .then((body) => {

            if (body.key === BestPosApiKey) {

                let options = {
                    "suppressAuth": true
                };

                let productOptions = {
                    "Grandeur": {
                        "choices": [{
                                "description": "250 g",
                                "value": "250",
                                //"inStock": false, // readonly for create
                                //"visible": false // readonly for create
                            },
                            {
                                "description": "500 g",
                                "value": "500",
                                //"inStock": false, // readonly for create
                                //"visible": false // readonly for create
                            }
                        ]
                    }
                };

                let itemId = body.ItemId
                let name = body.name.toLowerCase();
                let price = body.price;

                // Find Product based on SKU (ItemId)
                return wixData.query("Stores/Products")
                    .eq("sku", itemId)
                    .find(options)
                    .then((results) => {

                        //response.body = { "message": results };
                        //return ok(response);

                        if (results.items.length === 1) {
                            let product = results.items[0];

                            //response.body = { "message": product };
                            //return ok(response);

                            // Update Product

                            return wixStores.updateProductFields(product._id, {
                                    "name": name,
                                    //"description": body.description,
                                    "price": price
                                })
                                .then((updatedProduct) => {

                                    // Update Variants

                                    let available = false;
                                    updateVariants(updatedProduct, 0, available, price);
                                    updateVariants(updatedProduct, 1, available, price);

                                    response.body = {
                                        "message": "Product has been updated"
                                    };
                                    return ok(response);
                                })
                                .catch((error) => {
                                    response.body = {
                                        "errorUpdate": error
                                    };
                                    return serverError(response);
                                });

                        } else if (results.items.length === 0) {

                            // Create Product

                            return wixStores.createProduct({
                                    "sku": itemId,
                                    "name": name,
                                    //"description": body.description,
                                    "price": price,
                                    "productOptions": productOptions,
                                    "manageVariants": true,
                                    "productType": "physical",
                                    "visible": true
                                })
                                .then((newProduct) => {

                                    // Update Variants

                                    let available = false;
                                    updateVariants(newProduct, 0, available, body.price);
                                    updateVariants(newProduct, 1, available, body.price);

                                    response.body = {
                                        "message": "Product has been created"
                                    };
                                    return ok(response);
                                })
                                .catch((error) => {
                                    response.body = {
                                        "errorCreate": error
                                    };
                                    return serverError(response);
                                });
                        }

                        response.body = {
                            "error": `'${request.path[0]}' was found '${results.items.length}' times`
                        };
                        return serverError(response);
                    })
                    .catch((error) => {
                        response.body = {
                            "errorQuery": error
                        };
                        return serverError(response);
                    });
            }

            response.body = {
                "error": "Not Permitted"
            };
            return serverError(response);

        })
        .catch((error) => {
            response.body = {
                "errorJSON": error
            };
            return serverError(response);
        });
}
