import { ok, serverError } from 'wix-http-functions';
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

                // Find Product based on SKU
                return wixData.query("Stores/Products")
                    .eq("sku", body.ItemId)
                    //.eq("_id", body.ItemId)
                    //.eq("name", body.name)
                    .find(options)
                    .then((results) => {

                        //response.body = { "message": results };
                        //return ok(response);

                        if (results.items.length === 1) {
                            let product = results.items[0];

                            // Update Product

                            return wixStores.updateProductFields(product._id, {
                                    "name": body.name,
                                    "description": body.description,
                                    "price": body.price,
                                    //"productOptions": productOptions,
                                    //"manageVariants": true,
                                    //"productType": "physical",
                                    //"visible": true
                                })
                                .then((updatedProduct) => {
                                    let i = 0;

                                    // Update Variants

                                    //response.body = { "message": updatedProduct };
                                    //return ok(response);

                                    let variantInfo = {
                                        trackQuantity: false,
                                        variants: [{
                                            variantId: updatedProduct.variants[1]._id,
                                            inStock: false
                                        }]
                                    };
                                    wixStores.updateInventoryVariantFieldsByProductId(updatedProduct._id, variantInfo)
                                        .then(() => {

                                            const choice = updatedProduct.variants[1].choices.Grandeur;
                                            const price = body.price * updatedProduct.productOptions.Grandeur.choices[1].value / 1000;
                                            const visible = false;
                                            let variantData = [{
                                                visible,
                                                price,
                                                "choices": {
                                                    "Grandeur": choice
                                                }
                                            }];

                                            wixStores.updateVariantData(updatedProduct._id, variantData)
                                            .then(() => {
                                                
                                            });
                                        });

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
                                    "sku": body.ItemId,
                                    "name": body.name,
                                    "description": body.description,
                                    "price": body.price,
                                    "productOptions": productOptions,
                                    "manageVariants": true,
                                    "productType": "physical",
                                    "visible": true
                                })
                                .then((newProduct) => {
                                    let i = 0;

                                    // Update Variants

                                    newProduct.variants.forEach(variant => {
                                        i++;

                                        let variantInfo = {
                                            trackQuantity: false,
                                            variants: [{
                                                variantId: variant._id,
                                                inStock: false
                                            }]
                                        };
                                        wixStores.updateInventoryVariantFieldsByProductId(newProduct._id, variantInfo)
                                            .then(() => {

                                                const choice = variant.choices.Grandeur;
                                                const price = body.price * i;
                                                const visible = false;
                                                variantInfo = [{
                                                    visible,
                                                    price,
                                                    "choices": {
                                                        "Grandeur": choice
                                                    }
                                                }];

                                                wixStores.updateVariantData(newProduct._id, variantInfo);
                                            });
                                    });

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
