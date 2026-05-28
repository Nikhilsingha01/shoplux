import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { Address, AddressInput, AddressUpdate, AdminSettings, AdminSettingsUpdate, AdminStats, Banner, BannerInput, BannerUpdate, Category, CategoryInput, CategoryUpdate, Coupon, CouponInput, CouponUpdate, CouponValidateInput, HealthStatus, HomepageProducts, ListOrdersParams, ListProductsParams, ListUsersParams, Order, OrderInput, OrderListResponse, OrderStatusUpdate, PaymentOrder, PaymentOrderInput, PaymentVerification, PaymentVerificationResult, Product, ProductInput, ProductListResponse, ProductUpdate, ReorderProducts200, ReorderProductsInput, SendChatMessage200, SendChatMessageInput, UserListResponse, WishlistInput, WishlistItem } from './api.schemas';
import type { ErrorType, BodyType } from '../custom-fetch';
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
export declare const getHealthCheckUrl: () => string;
/**
 * Returns server health status
 * @summary Health check
 */
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListProductsUrl: (params?: ListProductsParams) => string;
/**
 * @summary List products with filters
 */
export declare const listProducts: (params?: ListProductsParams, options?: RequestInit) => Promise<ProductListResponse>;
export declare const getListProductsQueryKey: (params?: ListProductsParams) => readonly ["/api/products", ...ListProductsParams[]];
export declare const getListProductsQueryOptions: <TData = Awaited<ReturnType<typeof listProducts>>, TError = ErrorType<unknown>>(params?: ListProductsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listProducts>>, TError, TData>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listProducts>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListProductsQueryResult = NonNullable<Awaited<ReturnType<typeof listProducts>>>;
export type ListProductsQueryError = ErrorType<unknown>;
/**
 * @summary List products with filters
 */
export declare function useListProducts<TData = Awaited<ReturnType<typeof listProducts>>, TError = ErrorType<unknown>>(params?: ListProductsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listProducts>>, TError, TData>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateProductUrl: () => string;
/**
 * @summary Create a product (admin only)
 */
export declare const createProduct: (productInput: ProductInput, options?: RequestInit) => Promise<Product>;
export declare const getCreateProductMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createProduct>>, TError, {
        data: BodyType<ProductInput>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createProduct>>, TError, {
    data: BodyType<ProductInput>;
}, TContext>;
export type CreateProductMutationResult = NonNullable<Awaited<ReturnType<typeof createProduct>>>;
export type CreateProductMutationBody = BodyType<ProductInput>;
export type CreateProductMutationError = ErrorType<unknown>;
/**
* @summary Create a product (admin only)
*/
export declare const useCreateProduct: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createProduct>>, TError, {
        data: BodyType<ProductInput>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof createProduct>>, TError, {
    data: BodyType<ProductInput>;
}, TContext>;
export declare const getListFeaturedProductsUrl: () => string;
/**
 * @summary Get featured/trending products for homepage
 */
export declare const listFeaturedProducts: (options?: RequestInit) => Promise<HomepageProducts>;
export declare const getListFeaturedProductsQueryKey: () => readonly ["/api/products/featured"];
export declare const getListFeaturedProductsQueryOptions: <TData = Awaited<ReturnType<typeof listFeaturedProducts>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listFeaturedProducts>>, TError, TData>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listFeaturedProducts>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListFeaturedProductsQueryResult = NonNullable<Awaited<ReturnType<typeof listFeaturedProducts>>>;
export type ListFeaturedProductsQueryError = ErrorType<unknown>;
/**
 * @summary Get featured/trending products for homepage
 */
export declare function useListFeaturedProducts<TData = Awaited<ReturnType<typeof listFeaturedProducts>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listFeaturedProducts>>, TError, TData>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetProductUrl: (id: number) => string;
/**
 * @summary Get product by ID
 */
export declare const getProduct: (id: number, options?: RequestInit) => Promise<Product>;
export declare const getGetProductQueryKey: (id: number) => readonly [`/api/products/${number}`];
export declare const getGetProductQueryOptions: <TData = Awaited<ReturnType<typeof getProduct>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getProduct>>, TError, TData>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getProduct>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetProductQueryResult = NonNullable<Awaited<ReturnType<typeof getProduct>>>;
export type GetProductQueryError = ErrorType<void>;
/**
 * @summary Get product by ID
 */
export declare function useGetProduct<TData = Awaited<ReturnType<typeof getProduct>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getProduct>>, TError, TData>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateProductUrl: (id: number) => string;
/**
 * @summary Update product (admin only)
 */
export declare const updateProduct: (id: number, productUpdate: ProductUpdate, options?: RequestInit) => Promise<Product>;
export declare const getUpdateProductMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateProduct>>, TError, {
        id: number;
        data: BodyType<ProductUpdate>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateProduct>>, TError, {
    id: number;
    data: BodyType<ProductUpdate>;
}, TContext>;
export type UpdateProductMutationResult = NonNullable<Awaited<ReturnType<typeof updateProduct>>>;
export type UpdateProductMutationBody = BodyType<ProductUpdate>;
export type UpdateProductMutationError = ErrorType<unknown>;
/**
* @summary Update product (admin only)
*/
export declare const useUpdateProduct: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateProduct>>, TError, {
        id: number;
        data: BodyType<ProductUpdate>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateProduct>>, TError, {
    id: number;
    data: BodyType<ProductUpdate>;
}, TContext>;
export declare const getDeleteProductUrl: (id: number) => string;
/**
 * @summary Delete product (admin only)
 */
export declare const deleteProduct: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteProductMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteProduct>>, TError, {
        id: number;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteProduct>>, TError, {
    id: number;
}, TContext>;
export type DeleteProductMutationResult = NonNullable<Awaited<ReturnType<typeof deleteProduct>>>;
export type DeleteProductMutationError = ErrorType<unknown>;
/**
* @summary Delete product (admin only)
*/
export declare const useDeleteProduct: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteProduct>>, TError, {
        id: number;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteProduct>>, TError, {
    id: number;
}, TContext>;
export declare const getListCategoriesUrl: () => string;
/**
 * @summary List all categories
 */
export declare const listCategories: (options?: RequestInit) => Promise<Category[]>;
export declare const getListCategoriesQueryKey: () => readonly ["/api/categories"];
export declare const getListCategoriesQueryOptions: <TData = Awaited<ReturnType<typeof listCategories>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listCategories>>, TError, TData>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listCategories>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListCategoriesQueryResult = NonNullable<Awaited<ReturnType<typeof listCategories>>>;
export type ListCategoriesQueryError = ErrorType<unknown>;
/**
 * @summary List all categories
 */
export declare function useListCategories<TData = Awaited<ReturnType<typeof listCategories>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listCategories>>, TError, TData>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateCategoryUrl: () => string;
/**
 * @summary Create category (admin only)
 */
export declare const createCategory: (categoryInput: CategoryInput, options?: RequestInit) => Promise<Category>;
export declare const getCreateCategoryMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createCategory>>, TError, {
        data: BodyType<CategoryInput>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createCategory>>, TError, {
    data: BodyType<CategoryInput>;
}, TContext>;
export type CreateCategoryMutationResult = NonNullable<Awaited<ReturnType<typeof createCategory>>>;
export type CreateCategoryMutationBody = BodyType<CategoryInput>;
export type CreateCategoryMutationError = ErrorType<unknown>;
/**
* @summary Create category (admin only)
*/
export declare const useCreateCategory: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createCategory>>, TError, {
        data: BodyType<CategoryInput>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof createCategory>>, TError, {
    data: BodyType<CategoryInput>;
}, TContext>;
export declare const getUpdateCategoryUrl: (id: number) => string;
/**
 * @summary Update category (admin only)
 */
export declare const updateCategory: (id: number, categoryUpdate: CategoryUpdate, options?: RequestInit) => Promise<Category>;
export declare const getUpdateCategoryMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateCategory>>, TError, {
        id: number;
        data: BodyType<CategoryUpdate>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateCategory>>, TError, {
    id: number;
    data: BodyType<CategoryUpdate>;
}, TContext>;
export type UpdateCategoryMutationResult = NonNullable<Awaited<ReturnType<typeof updateCategory>>>;
export type UpdateCategoryMutationBody = BodyType<CategoryUpdate>;
export type UpdateCategoryMutationError = ErrorType<unknown>;
/**
* @summary Update category (admin only)
*/
export declare const useUpdateCategory: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateCategory>>, TError, {
        id: number;
        data: BodyType<CategoryUpdate>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateCategory>>, TError, {
    id: number;
    data: BodyType<CategoryUpdate>;
}, TContext>;
export declare const getDeleteCategoryUrl: (id: number) => string;
/**
 * @summary Delete category (admin only)
 */
export declare const deleteCategory: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteCategoryMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteCategory>>, TError, {
        id: number;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteCategory>>, TError, {
    id: number;
}, TContext>;
export type DeleteCategoryMutationResult = NonNullable<Awaited<ReturnType<typeof deleteCategory>>>;
export type DeleteCategoryMutationError = ErrorType<unknown>;
/**
* @summary Delete category (admin only)
*/
export declare const useDeleteCategory: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteCategory>>, TError, {
        id: number;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteCategory>>, TError, {
    id: number;
}, TContext>;
export declare const getListBannersUrl: () => string;
/**
 * @summary List active banners
 */
export declare const listBanners: (options?: RequestInit) => Promise<Banner[]>;
export declare const getListBannersQueryKey: () => readonly ["/api/banners"];
export declare const getListBannersQueryOptions: <TData = Awaited<ReturnType<typeof listBanners>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBanners>>, TError, TData>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listBanners>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListBannersQueryResult = NonNullable<Awaited<ReturnType<typeof listBanners>>>;
export type ListBannersQueryError = ErrorType<unknown>;
/**
 * @summary List active banners
 */
export declare function useListBanners<TData = Awaited<ReturnType<typeof listBanners>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBanners>>, TError, TData>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateBannerUrl: () => string;
/**
 * @summary Create banner (admin only)
 */
export declare const createBanner: (bannerInput: BannerInput, options?: RequestInit) => Promise<Banner>;
export declare const getCreateBannerMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createBanner>>, TError, {
        data: BodyType<BannerInput>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createBanner>>, TError, {
    data: BodyType<BannerInput>;
}, TContext>;
export type CreateBannerMutationResult = NonNullable<Awaited<ReturnType<typeof createBanner>>>;
export type CreateBannerMutationBody = BodyType<BannerInput>;
export type CreateBannerMutationError = ErrorType<unknown>;
/**
* @summary Create banner (admin only)
*/
export declare const useCreateBanner: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createBanner>>, TError, {
        data: BodyType<BannerInput>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof createBanner>>, TError, {
    data: BodyType<BannerInput>;
}, TContext>;
export declare const getUpdateBannerUrl: (id: number) => string;
/**
 * @summary Update banner (admin only)
 */
export declare const updateBanner: (id: number, bannerUpdate: BannerUpdate, options?: RequestInit) => Promise<Banner>;
export declare const getUpdateBannerMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateBanner>>, TError, {
        id: number;
        data: BodyType<BannerUpdate>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateBanner>>, TError, {
    id: number;
    data: BodyType<BannerUpdate>;
}, TContext>;
export type UpdateBannerMutationResult = NonNullable<Awaited<ReturnType<typeof updateBanner>>>;
export type UpdateBannerMutationBody = BodyType<BannerUpdate>;
export type UpdateBannerMutationError = ErrorType<unknown>;
/**
* @summary Update banner (admin only)
*/
export declare const useUpdateBanner: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateBanner>>, TError, {
        id: number;
        data: BodyType<BannerUpdate>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateBanner>>, TError, {
    id: number;
    data: BodyType<BannerUpdate>;
}, TContext>;
export declare const getDeleteBannerUrl: (id: number) => string;
/**
 * @summary Delete banner (admin only)
 */
export declare const deleteBanner: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteBannerMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteBanner>>, TError, {
        id: number;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteBanner>>, TError, {
    id: number;
}, TContext>;
export type DeleteBannerMutationResult = NonNullable<Awaited<ReturnType<typeof deleteBanner>>>;
export type DeleteBannerMutationError = ErrorType<unknown>;
/**
* @summary Delete banner (admin only)
*/
export declare const useDeleteBanner: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteBanner>>, TError, {
        id: number;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteBanner>>, TError, {
    id: number;
}, TContext>;
export declare const getListOrdersUrl: (params?: ListOrdersParams) => string;
/**
 * @summary List user's orders (or all orders for admin)
 */
export declare const listOrders: (params?: ListOrdersParams, options?: RequestInit) => Promise<OrderListResponse>;
export declare const getListOrdersQueryKey: (params?: ListOrdersParams) => readonly ["/api/orders", ...ListOrdersParams[]];
export declare const getListOrdersQueryOptions: <TData = Awaited<ReturnType<typeof listOrders>>, TError = ErrorType<unknown>>(params?: ListOrdersParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listOrders>>, TError, TData>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listOrders>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListOrdersQueryResult = NonNullable<Awaited<ReturnType<typeof listOrders>>>;
export type ListOrdersQueryError = ErrorType<unknown>;
/**
 * @summary List user's orders (or all orders for admin)
 */
export declare function useListOrders<TData = Awaited<ReturnType<typeof listOrders>>, TError = ErrorType<unknown>>(params?: ListOrdersParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listOrders>>, TError, TData>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateOrderUrl: () => string;
/**
 * @summary Place an order
 */
export declare const createOrder: (orderInput: OrderInput, options?: RequestInit) => Promise<Order>;
export declare const getCreateOrderMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createOrder>>, TError, {
        data: BodyType<OrderInput>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createOrder>>, TError, {
    data: BodyType<OrderInput>;
}, TContext>;
export type CreateOrderMutationResult = NonNullable<Awaited<ReturnType<typeof createOrder>>>;
export type CreateOrderMutationBody = BodyType<OrderInput>;
export type CreateOrderMutationError = ErrorType<unknown>;
/**
* @summary Place an order
*/
export declare const useCreateOrder: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createOrder>>, TError, {
        data: BodyType<OrderInput>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof createOrder>>, TError, {
    data: BodyType<OrderInput>;
}, TContext>;
export declare const getGetOrderUrl: (id: number) => string;
/**
 * @summary Get order by ID
 */
export declare const getOrder: (id: number, options?: RequestInit) => Promise<Order>;
export declare const getGetOrderQueryKey: (id: number) => readonly [`/api/orders/${number}`];
export declare const getGetOrderQueryOptions: <TData = Awaited<ReturnType<typeof getOrder>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getOrder>>, TError, TData>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getOrder>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetOrderQueryResult = NonNullable<Awaited<ReturnType<typeof getOrder>>>;
export type GetOrderQueryError = ErrorType<void>;
/**
 * @summary Get order by ID
 */
export declare function useGetOrder<TData = Awaited<ReturnType<typeof getOrder>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getOrder>>, TError, TData>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateOrderStatusUrl: (id: number) => string;
/**
 * @summary Update order status (admin only)
 */
export declare const updateOrderStatus: (id: number, orderStatusUpdate: OrderStatusUpdate, options?: RequestInit) => Promise<Order>;
export declare const getUpdateOrderStatusMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateOrderStatus>>, TError, {
        id: number;
        data: BodyType<OrderStatusUpdate>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateOrderStatus>>, TError, {
    id: number;
    data: BodyType<OrderStatusUpdate>;
}, TContext>;
export type UpdateOrderStatusMutationResult = NonNullable<Awaited<ReturnType<typeof updateOrderStatus>>>;
export type UpdateOrderStatusMutationBody = BodyType<OrderStatusUpdate>;
export type UpdateOrderStatusMutationError = ErrorType<unknown>;
/**
* @summary Update order status (admin only)
*/
export declare const useUpdateOrderStatus: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateOrderStatus>>, TError, {
        id: number;
        data: BodyType<OrderStatusUpdate>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateOrderStatus>>, TError, {
    id: number;
    data: BodyType<OrderStatusUpdate>;
}, TContext>;
export declare const getCreatePaymentOrderUrl: () => string;
/**
 * @summary Create Razorpay payment order
 */
export declare const createPaymentOrder: (paymentOrderInput: PaymentOrderInput, options?: RequestInit) => Promise<PaymentOrder>;
export declare const getCreatePaymentOrderMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createPaymentOrder>>, TError, {
        data: BodyType<PaymentOrderInput>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createPaymentOrder>>, TError, {
    data: BodyType<PaymentOrderInput>;
}, TContext>;
export type CreatePaymentOrderMutationResult = NonNullable<Awaited<ReturnType<typeof createPaymentOrder>>>;
export type CreatePaymentOrderMutationBody = BodyType<PaymentOrderInput>;
export type CreatePaymentOrderMutationError = ErrorType<unknown>;
/**
* @summary Create Razorpay payment order
*/
export declare const useCreatePaymentOrder: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createPaymentOrder>>, TError, {
        data: BodyType<PaymentOrderInput>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof createPaymentOrder>>, TError, {
    data: BodyType<PaymentOrderInput>;
}, TContext>;
export declare const getVerifyPaymentUrl: () => string;
/**
 * @summary Verify Razorpay payment
 */
export declare const verifyPayment: (paymentVerification: PaymentVerification, options?: RequestInit) => Promise<PaymentVerificationResult>;
export declare const getVerifyPaymentMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof verifyPayment>>, TError, {
        data: BodyType<PaymentVerification>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof verifyPayment>>, TError, {
    data: BodyType<PaymentVerification>;
}, TContext>;
export type VerifyPaymentMutationResult = NonNullable<Awaited<ReturnType<typeof verifyPayment>>>;
export type VerifyPaymentMutationBody = BodyType<PaymentVerification>;
export type VerifyPaymentMutationError = ErrorType<unknown>;
/**
* @summary Verify Razorpay payment
*/
export declare const useVerifyPayment: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof verifyPayment>>, TError, {
        data: BodyType<PaymentVerification>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof verifyPayment>>, TError, {
    data: BodyType<PaymentVerification>;
}, TContext>;
export declare const getListAddressesUrl: () => string;
/**
 * @summary List user addresses
 */
export declare const listAddresses: (options?: RequestInit) => Promise<Address[]>;
export declare const getListAddressesQueryKey: () => readonly ["/api/addresses"];
export declare const getListAddressesQueryOptions: <TData = Awaited<ReturnType<typeof listAddresses>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAddresses>>, TError, TData>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listAddresses>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListAddressesQueryResult = NonNullable<Awaited<ReturnType<typeof listAddresses>>>;
export type ListAddressesQueryError = ErrorType<unknown>;
/**
 * @summary List user addresses
 */
export declare function useListAddresses<TData = Awaited<ReturnType<typeof listAddresses>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAddresses>>, TError, TData>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateAddressUrl: () => string;
/**
 * @summary Create address
 */
export declare const createAddress: (addressInput: AddressInput, options?: RequestInit) => Promise<Address>;
export declare const getCreateAddressMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createAddress>>, TError, {
        data: BodyType<AddressInput>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createAddress>>, TError, {
    data: BodyType<AddressInput>;
}, TContext>;
export type CreateAddressMutationResult = NonNullable<Awaited<ReturnType<typeof createAddress>>>;
export type CreateAddressMutationBody = BodyType<AddressInput>;
export type CreateAddressMutationError = ErrorType<unknown>;
/**
* @summary Create address
*/
export declare const useCreateAddress: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createAddress>>, TError, {
        data: BodyType<AddressInput>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof createAddress>>, TError, {
    data: BodyType<AddressInput>;
}, TContext>;
export declare const getUpdateAddressUrl: (id: number) => string;
/**
 * @summary Update address
 */
export declare const updateAddress: (id: number, addressUpdate: AddressUpdate, options?: RequestInit) => Promise<Address>;
export declare const getUpdateAddressMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateAddress>>, TError, {
        id: number;
        data: BodyType<AddressUpdate>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateAddress>>, TError, {
    id: number;
    data: BodyType<AddressUpdate>;
}, TContext>;
export type UpdateAddressMutationResult = NonNullable<Awaited<ReturnType<typeof updateAddress>>>;
export type UpdateAddressMutationBody = BodyType<AddressUpdate>;
export type UpdateAddressMutationError = ErrorType<unknown>;
/**
* @summary Update address
*/
export declare const useUpdateAddress: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateAddress>>, TError, {
        id: number;
        data: BodyType<AddressUpdate>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateAddress>>, TError, {
    id: number;
    data: BodyType<AddressUpdate>;
}, TContext>;
export declare const getDeleteAddressUrl: (id: number) => string;
/**
 * @summary Delete address
 */
export declare const deleteAddress: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteAddressMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteAddress>>, TError, {
        id: number;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteAddress>>, TError, {
    id: number;
}, TContext>;
export type DeleteAddressMutationResult = NonNullable<Awaited<ReturnType<typeof deleteAddress>>>;
export type DeleteAddressMutationError = ErrorType<unknown>;
/**
* @summary Delete address
*/
export declare const useDeleteAddress: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteAddress>>, TError, {
        id: number;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteAddress>>, TError, {
    id: number;
}, TContext>;
export declare const getGetWishlistUrl: () => string;
/**
 * @summary Get user wishlist
 */
export declare const getWishlist: (options?: RequestInit) => Promise<WishlistItem[]>;
export declare const getGetWishlistQueryKey: () => readonly ["/api/wishlist"];
export declare const getGetWishlistQueryOptions: <TData = Awaited<ReturnType<typeof getWishlist>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getWishlist>>, TError, TData>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getWishlist>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetWishlistQueryResult = NonNullable<Awaited<ReturnType<typeof getWishlist>>>;
export type GetWishlistQueryError = ErrorType<unknown>;
/**
 * @summary Get user wishlist
 */
export declare function useGetWishlist<TData = Awaited<ReturnType<typeof getWishlist>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getWishlist>>, TError, TData>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getAddToWishlistUrl: () => string;
/**
 * @summary Add product to wishlist
 */
export declare const addToWishlist: (wishlistInput: WishlistInput, options?: RequestInit) => Promise<WishlistItem>;
export declare const getAddToWishlistMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof addToWishlist>>, TError, {
        data: BodyType<WishlistInput>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof addToWishlist>>, TError, {
    data: BodyType<WishlistInput>;
}, TContext>;
export type AddToWishlistMutationResult = NonNullable<Awaited<ReturnType<typeof addToWishlist>>>;
export type AddToWishlistMutationBody = BodyType<WishlistInput>;
export type AddToWishlistMutationError = ErrorType<unknown>;
/**
* @summary Add product to wishlist
*/
export declare const useAddToWishlist: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof addToWishlist>>, TError, {
        data: BodyType<WishlistInput>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof addToWishlist>>, TError, {
    data: BodyType<WishlistInput>;
}, TContext>;
export declare const getRemoveFromWishlistUrl: (productId: number) => string;
/**
 * @summary Remove product from wishlist
 */
export declare const removeFromWishlist: (productId: number, options?: RequestInit) => Promise<void>;
export declare const getRemoveFromWishlistMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof removeFromWishlist>>, TError, {
        productId: number;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof removeFromWishlist>>, TError, {
    productId: number;
}, TContext>;
export type RemoveFromWishlistMutationResult = NonNullable<Awaited<ReturnType<typeof removeFromWishlist>>>;
export type RemoveFromWishlistMutationError = ErrorType<unknown>;
/**
* @summary Remove product from wishlist
*/
export declare const useRemoveFromWishlist: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof removeFromWishlist>>, TError, {
        productId: number;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof removeFromWishlist>>, TError, {
    productId: number;
}, TContext>;
export declare const getValidateCouponUrl: () => string;
/**
 * @summary Validate a coupon code
 */
export declare const validateCoupon: (couponValidateInput: CouponValidateInput, options?: RequestInit) => Promise<Coupon>;
export declare const getValidateCouponMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof validateCoupon>>, TError, {
        data: BodyType<CouponValidateInput>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof validateCoupon>>, TError, {
    data: BodyType<CouponValidateInput>;
}, TContext>;
export type ValidateCouponMutationResult = NonNullable<Awaited<ReturnType<typeof validateCoupon>>>;
export type ValidateCouponMutationBody = BodyType<CouponValidateInput>;
export type ValidateCouponMutationError = ErrorType<void>;
/**
* @summary Validate a coupon code
*/
export declare const useValidateCoupon: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof validateCoupon>>, TError, {
        data: BodyType<CouponValidateInput>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof validateCoupon>>, TError, {
    data: BodyType<CouponValidateInput>;
}, TContext>;
export declare const getListCouponsUrl: () => string;
/**
 * @summary List coupons (admin only)
 */
export declare const listCoupons: (options?: RequestInit) => Promise<Coupon[]>;
export declare const getListCouponsQueryKey: () => readonly ["/api/coupons"];
export declare const getListCouponsQueryOptions: <TData = Awaited<ReturnType<typeof listCoupons>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listCoupons>>, TError, TData>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listCoupons>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListCouponsQueryResult = NonNullable<Awaited<ReturnType<typeof listCoupons>>>;
export type ListCouponsQueryError = ErrorType<unknown>;
/**
 * @summary List coupons (admin only)
 */
export declare function useListCoupons<TData = Awaited<ReturnType<typeof listCoupons>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listCoupons>>, TError, TData>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateCouponUrl: () => string;
/**
 * @summary Create coupon (admin only)
 */
export declare const createCoupon: (couponInput: CouponInput, options?: RequestInit) => Promise<Coupon>;
export declare const getCreateCouponMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createCoupon>>, TError, {
        data: BodyType<CouponInput>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createCoupon>>, TError, {
    data: BodyType<CouponInput>;
}, TContext>;
export type CreateCouponMutationResult = NonNullable<Awaited<ReturnType<typeof createCoupon>>>;
export type CreateCouponMutationBody = BodyType<CouponInput>;
export type CreateCouponMutationError = ErrorType<unknown>;
/**
* @summary Create coupon (admin only)
*/
export declare const useCreateCoupon: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createCoupon>>, TError, {
        data: BodyType<CouponInput>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof createCoupon>>, TError, {
    data: BodyType<CouponInput>;
}, TContext>;
export declare const getUpdateCouponUrl: (id: number) => string;
/**
 * @summary Update coupon (admin only)
 */
export declare const updateCoupon: (id: number, couponUpdate: CouponUpdate, options?: RequestInit) => Promise<Coupon>;
export declare const getUpdateCouponMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateCoupon>>, TError, {
        id: number;
        data: BodyType<CouponUpdate>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateCoupon>>, TError, {
    id: number;
    data: BodyType<CouponUpdate>;
}, TContext>;
export type UpdateCouponMutationResult = NonNullable<Awaited<ReturnType<typeof updateCoupon>>>;
export type UpdateCouponMutationBody = BodyType<CouponUpdate>;
export type UpdateCouponMutationError = ErrorType<unknown>;
/**
* @summary Update coupon (admin only)
*/
export declare const useUpdateCoupon: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateCoupon>>, TError, {
        id: number;
        data: BodyType<CouponUpdate>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateCoupon>>, TError, {
    id: number;
    data: BodyType<CouponUpdate>;
}, TContext>;
export declare const getDeleteCouponUrl: (id: number) => string;
/**
 * @summary Delete coupon (admin only)
 */
export declare const deleteCoupon: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteCouponMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteCoupon>>, TError, {
        id: number;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteCoupon>>, TError, {
    id: number;
}, TContext>;
export type DeleteCouponMutationResult = NonNullable<Awaited<ReturnType<typeof deleteCoupon>>>;
export type DeleteCouponMutationError = ErrorType<unknown>;
/**
* @summary Delete coupon (admin only)
*/
export declare const useDeleteCoupon: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteCoupon>>, TError, {
        id: number;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteCoupon>>, TError, {
    id: number;
}, TContext>;
export declare const getGetAdminStatsUrl: () => string;
/**
 * @summary Get admin dashboard statistics
 */
export declare const getAdminStats: (options?: RequestInit) => Promise<AdminStats>;
export declare const getGetAdminStatsQueryKey: () => readonly ["/api/admin/stats"];
export declare const getGetAdminStatsQueryOptions: <TData = Awaited<ReturnType<typeof getAdminStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAdminStats>>, TError, TData>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAdminStats>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAdminStatsQueryResult = NonNullable<Awaited<ReturnType<typeof getAdminStats>>>;
export type GetAdminStatsQueryError = ErrorType<unknown>;
/**
 * @summary Get admin dashboard statistics
 */
export declare function useGetAdminStats<TData = Awaited<ReturnType<typeof getAdminStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAdminStats>>, TError, TData>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetAdminSettingsUrl: () => string;
/**
 * @summary Get store settings
 */
export declare const getAdminSettings: (options?: RequestInit) => Promise<AdminSettings>;
export declare const getGetAdminSettingsQueryKey: () => readonly ["/api/admin/settings"];
export declare const getGetAdminSettingsQueryOptions: <TData = Awaited<ReturnType<typeof getAdminSettings>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAdminSettings>>, TError, TData>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAdminSettings>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAdminSettingsQueryResult = NonNullable<Awaited<ReturnType<typeof getAdminSettings>>>;
export type GetAdminSettingsQueryError = ErrorType<unknown>;
/**
 * @summary Get store settings
 */
export declare function useGetAdminSettings<TData = Awaited<ReturnType<typeof getAdminSettings>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAdminSettings>>, TError, TData>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateAdminSettingsUrl: () => string;
/**
 * @summary Update store settings
 */
export declare const updateAdminSettings: (adminSettingsUpdate: AdminSettingsUpdate, options?: RequestInit) => Promise<AdminSettings>;
export declare const getUpdateAdminSettingsMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateAdminSettings>>, TError, {
        data: BodyType<AdminSettingsUpdate>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateAdminSettings>>, TError, {
    data: BodyType<AdminSettingsUpdate>;
}, TContext>;
export type UpdateAdminSettingsMutationResult = NonNullable<Awaited<ReturnType<typeof updateAdminSettings>>>;
export type UpdateAdminSettingsMutationBody = BodyType<AdminSettingsUpdate>;
export type UpdateAdminSettingsMutationError = ErrorType<unknown>;
/**
* @summary Update store settings
*/
export declare const useUpdateAdminSettings: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateAdminSettings>>, TError, {
        data: BodyType<AdminSettingsUpdate>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateAdminSettings>>, TError, {
    data: BodyType<AdminSettingsUpdate>;
}, TContext>;
export declare const getReorderProductsUrl: () => string;
/**
 * @summary Reorder products (admin only)
 */
export declare const reorderProducts: (reorderProductsInput: ReorderProductsInput, options?: RequestInit) => Promise<ReorderProducts200>;
export declare const getReorderProductsMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof reorderProducts>>, TError, {
        data: BodyType<ReorderProductsInput>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof reorderProducts>>, TError, {
    data: BodyType<ReorderProductsInput>;
}, TContext>;
export type ReorderProductsMutationResult = NonNullable<Awaited<ReturnType<typeof reorderProducts>>>;
export type ReorderProductsMutationBody = BodyType<ReorderProductsInput>;
export type ReorderProductsMutationError = ErrorType<unknown>;
/**
* @summary Reorder products (admin only)
*/
export declare const useReorderProducts: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof reorderProducts>>, TError, {
        data: BodyType<ReorderProductsInput>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof reorderProducts>>, TError, {
    data: BodyType<ReorderProductsInput>;
}, TContext>;
export declare const getSendChatMessageUrl: () => string;
/**
 * @summary Send a message to the AI Chatbot
 */
export declare const sendChatMessage: (sendChatMessageInput: SendChatMessageInput, options?: RequestInit) => Promise<SendChatMessage200>;
export declare const getSendChatMessageMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendChatMessage>>, TError, {
        data: BodyType<SendChatMessageInput>;
    }, TContext>;
}) => UseMutationOptions<Awaited<ReturnType<typeof sendChatMessage>>, TError, {
    data: BodyType<SendChatMessageInput>;
}, TContext>;
export type SendChatMessageMutationResult = NonNullable<Awaited<ReturnType<typeof sendChatMessage>>>;
export type SendChatMessageMutationBody = BodyType<SendChatMessageInput>;
export type SendChatMessageMutationError = ErrorType<unknown>;
/**
* @summary Send a message to the AI Chatbot
*/
export declare const useSendChatMessage: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendChatMessage>>, TError, {
        data: BodyType<SendChatMessageInput>;
    }, TContext>;
}) => UseMutationResult<Awaited<ReturnType<typeof sendChatMessage>>, TError, {
    data: BodyType<SendChatMessageInput>;
}, TContext>;
export declare const getListUsersUrl: (params?: ListUsersParams) => string;
/**
 * @summary List all users (admin only)
 */
export declare const listUsers: (params?: ListUsersParams, options?: RequestInit) => Promise<UserListResponse>;
export declare const getListUsersQueryKey: (params?: ListUsersParams) => readonly ["/api/admin/users", ...ListUsersParams[]];
export declare const getListUsersQueryOptions: <TData = Awaited<ReturnType<typeof listUsers>>, TError = ErrorType<unknown>>(params?: ListUsersParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listUsers>>, TError, TData>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listUsers>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListUsersQueryResult = NonNullable<Awaited<ReturnType<typeof listUsers>>>;
export type ListUsersQueryError = ErrorType<unknown>;
/**
 * @summary List all users (admin only)
 */
export declare function useListUsers<TData = Awaited<ReturnType<typeof listUsers>>, TError = ErrorType<unknown>>(params?: ListUsersParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listUsers>>, TError, TData>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export {};
//# sourceMappingURL=api.d.ts.map