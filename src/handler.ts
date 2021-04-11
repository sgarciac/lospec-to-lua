import ntc from 'ntc'

export async function handleRequest(request: Request): Promise<Response> {
  const urlParts = request.url.split('/')
  const paletteName = urlParts[urlParts.length - 1]

  try {
    const init = {
      headers: {
        'content-type': 'application/json;charset=UTF-8',
      },
    }

    const lospecResponse = await fetch(
      `https://lospec.com/palette-list/${paletteName}.json`,
      init,
    )

    if (lospecResponse.status != 200) {
      return new Response(`Uhm, palette ${paletteName} not found :(`, {
        status: 404,
      })
    }

    const palette = await lospecResponse.json()
    const ntcInstance = ntc.init()
    const colors = []
    const colorNames: { [name: string]: number } = {}

    for (let color of palette.colors) {
      let [hex, name, exactMatch] = ntc.name(color)
      let [r, g, b] = hexToRgb(color)

      name = (name as string).toLowerCase()
      name = (name as string).replaceAll(' ', '_')
      name = (name as string).replaceAll('_/_', '_')

      // prevent collisions
      if (colorNames[name]) {
        colorNames[name]++
        name = name + colorNames[name]
      } else {
        colorNames[name] = 1
      }

      colors.push({ name, hex: color, r, g, b, exactMatch })
    }

    return new Response(colorsToLua(palette.name, paletteName, colors))
  } catch (e) {
    return new Response(e)
  }
}

function colorsToLua(
  name: string,
  id: string,
  colors: {
    name: string
    hex: string
    r: number
    g: number
    b: number
    exactMatch: boolean
  }[],
): string {
  let result = ''
  result = result + `-- ${name} https://lospec.com/palette-list/${id}\n`
  result = result + 'local colors = {}\n\n'
  for (let color of colors) {
    result =
      result +
      `colors.${color.name} = {${displayFloat(color.r)}, ${displayFloat(
        color.g,
      )}, ${displayFloat(color.b)}} -- #${color.hex}\n`
  }
  result = result + '\nreturn colors'
  return result
}

function hexToRgb(hex: string): number[] {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
      ]
    : []
}

function displayFloat(value: number): string {
  var s = value.toString()
  return s.substr(0, 6)
}
