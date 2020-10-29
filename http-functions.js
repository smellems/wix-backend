import { ok, badRequest, notFound, serverError } from 'wix-http-functions';
import { getSecret } from 'wix-secrets-backend';
import wixStores from 'wix-stores-backend';
import wixData from 'wix-data';

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
                                "inStock": false,
                                "visible": false
                            },
                            {
                                "description": "500 g",
                                "value": "500",
                                "inStock": false,
                                "visible": false
                            }
                        ]
                    }
                };

                // Find Product
                return wixData.query("Stores/Products")
                    //.eq("sku", body.ItemId)
                    .eq("sku", body.ItemId)
                    .find(options)
                    .then((results) => {
                        if (results.items.length === 1) {
                            let product = results.items[0];

                            //response.body = { "message": product };
                            //return ok(response);

                            // Update Product

                            wixStores.updateProductFields(product._id, {
                                "name": body.name,
                                "description": body.description,
                                "price": body.price,
                                "productOptions": productOptions,
                                "manageVariants": true,
                                "productType": "physical",
                                "visible": false
                            })

                            response.body = {
                                "message": "Product has been updated"
                            };
                            return ok(response);

                        } else if (results.items.length === 0) {

                            // Create Product

                            return wixStores.createProduct({
                                    "sku": body.ItemId,
                                    "name": body.name,
                                    "description": body.description,
                                    "price": body.price,
                                    "productOptions": productOptions,
                                    "manageVariants": true,
                                    "productType": "physical",
                                    "visible": false
                                })
                                .then((product) => {
                                    let i = 0;
                                    product.variants.forEach(variant => {
                                        i++;
                                        let variantInfo = {
                                            trackQuantity: false,
                                            variants: [{
                                                variantId: variant._id,
                                                inStock: false
                                            }]
                                        };
                                        wixStores.updateInventoryVariantFieldsByProductId(product._id, variantInfo);

                                        const choice = variant.choices.Grandeur;
                                        const price = body.price * i;
                                        //const sku = body.ItemId + "-" + i;
                                        const visible = false;
                                        variantInfo = [{
                                            visible,
                                            //sku,
                                            price,
                                            "choices": {
                                                "Grandeur": choice
                                            }
                                        }];
                                        wixStores.updateVariantData(product._id, variantInfo);

                                    });
                                    response.body = {
                                        "message": "Product has been created with " + i + " variant(s)"
                                    };
                                    return ok(response);
                                })
                        }

                        response.body = {
                            "error": `'${request.path[0]}' was found '${results.items.length}' times`
                        };
                        return serverError(response);
                    })
                    .catch((error) => {
                        response.body = {
                            "error": error
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
                "error": error
            };
            return serverError(response);
        });
}
