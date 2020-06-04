
#![allow(dead_code)]
use cfg_if::cfg_if;
use wasm_bindgen::prelude::*;

use core;
use log::error;

cfg_if! {
    // When the `console_error_panic_hook` feature is enabled, we can call the
    // `set_panic_hook` function at least once during initialization, and then
    // we will get better error messages if our code ever panics.
    //
    // For more details see
    // https://github.com/rustwasm/console_error_panic_hook#readme
    if #[cfg(feature = "console_error_panic_hook")] {
        extern crate console_error_panic_hook;
        pub use self::console_error_panic_hook::set_once as set_panic_hook;
    } else {
        #[inline]
        pub fn set_panic_hook() {}
    }
}

cfg_if! {
    if #[cfg(feature = "console_log")] {
        fn init_log() {
            use log::Level;
            console_log::init_with_level(Level::Info).expect("error initializing log");
        }
    } else {
        fn init_log() {}
    }
}

cfg_if! {
    // When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
    // allocator.
    if #[cfg(feature = "wee_alloc")] {
        extern crate wee_alloc;
        #[global_allocator]
        static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;
    }
}

#[wasm_bindgen]
pub fn init_wasm() {
    init_log();
}

#[wasm_bindgen]
pub fn markup_as_struct(markup: &str) -> JsValue {
    match core::markup_as_struct(markup) {
        Ok(res) => {
            JsValue::from_serde(&res).unwrap()
        },
        Err(_) => {
            error!("markup_compiler failed");
            JsValue::from_serde(&"error").unwrap()
        }
    }
}

#[wasm_bindgen]
pub fn markup_splitter(markup: &str) -> JsValue {
    match core::split_markup(markup) {
        Ok(res) => {
            JsValue::from_serde(&res).unwrap()
        },
        Err(_) => {
            error!("markup_splitter failed");
            JsValue::from_serde(&"error").unwrap()
        }
    }
}
