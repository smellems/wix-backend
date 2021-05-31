import { ok, serverError } from 'wix-http-functions';
import { getSecret } from 'wix-secrets-backend';
import wixStores from 'wix-stores-backend';
import wixData from 'wix-data';

export function updateVariants(product, choiceNb, visible, newPrice, choicesType) {

    let variantInfo = {
        trackQuantity: false,
        variants: [{
            variantId: product.variants[choiceNb]._id,
            inStock: visible
        }]
    };

    wixStores.updateInventoryVariantFieldsByProductId(product._id, variantInfo)
        .then(() => {
            if (choicesType !== "Unit") {
                let choice = product.variants[choiceNb].choices[choicesType];
                let price = (newPrice * product.productOptions[choicesType].choices[choiceNb].value / 1000).toFixed(2);
                let variantData = [{
                    visible,
                    price,
                    "choices": {
                        [choicesType]: choice
                    }
                }];
                wixStores.updateVariantData(product._id, variantData);
            }
        });
}

export function updateCollectionsAndVariants(department, options, product, variants, choicesType, available, price) {
    wixData.query("Stores/Collections")
        .startsWith("name", department)
        .find(options)
        .then((results2) => {
            if (results2.items.length > 0) {
                let collection = results2.items[0];
                wixStores.addProductsToCollection(collection._id, [product._id]);
            }
        });

    if (variants !== "") {
        let nbChoices = product.productOptions[choicesType].choices.length;
        for (let i = 0; i < nbChoices; i++) {
            updateVariants(product, i, available, price, choicesType);
        }
    } else {
        updateVariants(product, 0, available, price, "Unit");
    }
}

export async function post_updateProduct(request) {

    const BestPosApiKey = await getSecret("BestPosApiKey");

    const capitalize = (s) => {
        if (typeof s !== 'string') return ''
        return s.charAt(0).toUpperCase() + s.slice(1)
    }

    let response = {
        "headers": {
            "Content-Type": "application/json"
        }
    };

    // get the request body
    return request.body.json()
        .then((body) => {

            //console.log(body);
            //response.body = { "message": body };
            //return ok(response);

            if (body.key === BestPosApiKey) {

                let sku = body.sku
                let name = capitalize(body.name.toLowerCase().replace(/á/g, "à"));
                let price = Number(body.price).toFixed(2);
                let quantity = Number(body.quantity);
                let department = capitalize(body.department.toLowerCase());
                //let group = body.group;
                //let supplier = body.supplier;
                //let tax1 = body.tax1;
                //let tax2 = body.tax2;
                let sizeChart = body.SizeChart;
                let brand = capitalize(body.brand.toLowerCase());
                let variants = body.variants;

                let available = (quantity > 1) ? true : false;
                let choicesType = (sizeChart !== "UNIT") ? "Couleur" : "Grandeur";
                let nameWeb = ((brand !== "") ? brand + " - " : "") + name;

                let productOptions = {
                    "250-500-1000": {
                        "Poid": {
                            "choices": [{
                                    "description": "250 g",
                                    "value": "250"
                                },
                                {
                                    "description": "500 g",
                                    "value": "500"
                                },
                                {
                                    "description": "1 Kg",
                                    "value": "1000"
                                }
                            ]
                        }
                    },
                    "50-100": {
                        "Poid": {
                            "choices": [{
                                    "description": "50 g",
                                    "value": "50"
                                },
                                {
                                    "description": "100 g",
                                    "value": "100"
                                }
                            ]
                        }
                    }
                };

                if (variants === "250-500-1000" || variants === "50-100") {
                    productOptions = productOptions[variants];
                    choicesType = "Poid";
                } else if (variants !== "" && parseInt(variants, 10) > 0) {
                    nameWeb = nameWeb + " - " + variants + "g";
                    price = (price * variants / 1000).toFixed(2);
                } else if (variants !== "" && variants.split("--").length > 0) {
                    let choices = [];
                    for (let i = 0; i < variants.split("--").length; i++) {
                        choices.push({
                            "description": capitalize(variants.split("--")[i].toLowerCase()),
                            "value": "1000"
                        });
                    }

                    productOptions = {
                        [choicesType]: {
                            "choices": choices
                        }
                    };
                } else {
                    variants = "";
                }

                // Logging
                console.log(sku + "-" + name + " (" + quantity + ") " + available + " - <" + variants + ">");

                let options = {
                    "suppressAuth": true
                };

                // Find Product based on SKU
                return wixData.query("Stores/Products")
                    .eq("sku", sku)
                    .find(options)
                    .then((results) => {

                        if (results.items.length > 0) {
                            let product = results.items[0];

                            // Update Product

                            return wixStores.resetVariantData(product._id)
                                .then(() => {
                                    return wixStores.deleteProductOptions(product._id)
                                        .then(() => {
                                            let productFields = {
                                                "name": nameWeb,
                                                "manageVariants": false,
                                                "price": price
                                            };

                                            if (variants !== "" && parseInt(variants, 10) > 0) {
                                                productFields = {
                                                    "name": nameWeb,
                                                    "manageVariants": false,
                                                    "price": price,
                                                    "pricePerUnitData": {
                                                        "totalQuantity": variants,
                                                        "totalMeasurementUnit": "G",
                                                        "baseQuantity": 100,
                                                        "baseMeasurementUnit": "G"
                                                    }
                                                }
                                            } else if (variants !== "") {
                                                productFields = {
                                                    "name": nameWeb,
                                                    "manageVariants": true,
                                                    "price": price,
                                                    "productOptions": productOptions
                                                }
                                            }
                                            return wixStores.updateProductFields(product._id, productFields)
                                                .then((updatedProduct) => {

                                                    updateCollectionsAndVariants(department, options, updatedProduct, variants, choicesType, available, price);

                                                })
                                                .then(() => {
                                                    response.body = { "message": "Product " + sku + " has been updated" };
                                                    return ok(response);
                                                }).catch((error) => {
                                                    response.body = { "errorUpdate": error };
                                                    return serverError(response);
                                                });
                                        }).catch((error) => {
                                            response.body = { "errorDeleteOptions": error };
                                            return serverError(response);
                                        });
                                }).catch((error) => {
                                    response.body = { "errorResetVariants": error };
                                    return serverError(response);
                                });

                        } else {

                            // Create Product
                            let productFields = {
                                "sku": sku,
                                "name": nameWeb,
                                "price": price,
                                "manageVariants": false,
                                "productType": "physical",
                                "visible": true
                            };

                            if (variants !== "" && parseInt(variants, 10) > 0) {
                                productFields = {
                                    "name": nameWeb,
                                    "manageVariants": false,
                                    "price": price,
                                    "pricePerUnitData": {
                                        "totalQuantity": variants,
                                        "totalMeasurementUnit": "G",
                                        "baseQuantity": 100,
                                        "baseMeasurementUnit": "G"
                                    }
                                }
                            } else if (variants !=="") {
                                productFields = {
                                    "sku": sku,
                                    "name": nameWeb,
                                    "price": price,
                                    "productOptions": productOptions,
                                    "manageVariants": true,
                                    "productType": "physical",
                                    "visible": true
                                }
                            }
                            return wixStores.createProduct(productFields)
                                .then((newProduct) => {

                                    updateCollectionsAndVariants(department, options, newProduct, variants, choicesType, available, price);

                                })
                                .then(() => {
                                    response.body = { "message": "Product " + sku + " has been created" };
                                    return ok(response);
                                })
                                .catch((error) => {
                                    response.body = { "errorCreate": error };
                                    return serverError(response);
                                });
                        }
                    })
                    .catch((error) => {
                        response.body = { "errorQuery": error };
                        return serverError(response);
                    });
            }

            response.body = { "error": "Not Permitted" };
            return serverError(response);

        })
        .catch((error) => {
            response.body = { "errorJSON": error };
            return serverError(response);
        });
}

/* test function
export function get_testQueryOrder(request) {

    let response = {
        "headers": {
            "Content-Type": "application/json"
        }
    };

    let options = {
        "suppressAuth": true
    };

    return wixData.query("Stores/Orders")
        .eq("number", 12345)
        .find(options)
        .then((results) => {
            let order = results.items[0];
            response.body = { "message": order };
            return ok(response);
        })
        .catch((error) => {
            response.body = { "errorQuery": error };
            return serverError(response);
        });
}*/
