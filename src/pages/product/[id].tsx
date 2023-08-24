import { GetStaticPaths, GetStaticPathsResult, GetStaticProps } from 'next'
import Image from 'next/image'
import { stripe } from '../../lib/stripe'
import Stripe from 'stripe'
import { ParsedUrlQuery } from 'querystring'
import {
  ImageContainer,
  ProductContainer,
  ProductDetails,
} from '../../styles/pages/product'
import { useRouter } from 'next/router'
import axios from 'axios'
import { useState } from 'react'

interface ProductProps {
  product: {
    id: string
    name: string
    imageUrl: string
    price: string
    description: string
    defaultPriceId: string
  }
}

export default function Product({ product }: ProductProps) {
  const { isFallback } = useRouter()
  const [isCreatingCheckoutSession, setIsCreatingCheckoutSession] =
    useState(false)

  // Valida se o está carregando os dados da pagina no getStaticProps
  if (isFallback) {
    return <p>Loading</p>
  }

  async function handleBuyProduct() {
    try {
      setIsCreatingCheckoutSession(true)

      const response = await axios.post('/api/checkout', {
        priceId: product.defaultPriceId,
      })

      const { checkoutUrl } = response.data

      // para rota externa
      window.location.href = checkoutUrl
    } catch (err) {
      setIsCreatingCheckoutSession(false)
      alert('Falha ao redirecionar ao checkout')
    }
  }

  return (
    <ProductContainer>
      <ImageContainer>
        <Image src={product.imageUrl} width={520} height={480} alt="" />
      </ImageContainer>

      <ProductDetails>
        <h1>{product.name}</h1>
        <span>{product.price}</span>

        <p>{product.description}</p>

        <button disabled={isCreatingCheckoutSession} onClick={handleBuyProduct}>
          Comprar Agora
        </button>
      </ProductDetails>
    </ProductContainer>
  )
}

export const getStaticPaths: GetStaticPaths = async (): Promise<
  GetStaticPathsResult<ParsedUrlQuery>
> => {
  return {
    paths: [{ params: { id: 'prod_OUj4mig5OSlVy2' } }],
    fallback: true,
    // false = só carrega pagina se o parametro bater com os configurados nos paths
    // true = carrega a pagina primeiro e tenta carregar o metodo getStaticProps ao mesmo tempo
    // blocking = Só mostra a tela depois de executado o getStaticProps
    // obs: optar pelo true e valida o isFallback com o useRouter e criar um loading
  }
}

export const getStaticProps: GetStaticProps<unknown, { id: string }> = async ({
  params,
}) => {
  const productId = params.id

  const product = await stripe.products.retrieve(productId, {
    expand: ['default_price'],
  })

  const price = product.default_price as Stripe.Price

  return {
    props: {
      product: {
        id: product.id,
        name: product.name,
        imageUrl: product.images[0],
        price: new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(price.unit_amount / 100),
        description: product.description,
        defaultPriceId: price.id,
      },
    },
    revalidate: 60 * 60 * 1, // 1 hora
  }
}
