define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'JBrowse/View/FeatureGlyph/Alignment'
],
function(
    declare,
    array,
    lang,
    Alignment
) {
return declare(Alignment, {

renderFeature( context, fRect ) {
    if( this.track.displayMode != 'collapsed' && !this.config.readCloud )
        context.clearRect( Math.floor(fRect.l), fRect.t, Math.ceil(fRect.w), fRect.h );


    if(fRect.f.pairedFeature()) {
        this.renderConnector( context, fRect );
        this.renderSegments( context, fRect );
        if( fRect.w > 2 ) {
            if( fRect.viewInfo.scale > 0.2 ) {
                this._drawMismatches( context, fRect, fRect.f.f1, this._getMismatches( fRect.f.f1 ) );
                this._drawMismatches( context, fRect, fRect.f.f2, this._getMismatches( fRect.f.f2 ) );
            }
            else {
                this._drawMismatches( context, fRect, fRect.f.f1, this._getSkipsAndDeletions( fRect.f.f1 ));
                this._drawMismatches( context, fRect, fRect.f.f2, this._getSkipsAndDeletions( fRect.f.f2 ));
            }
        }

    } else {
        this.inherited(arguments)
    }
},

renderSegments( context, fRect ) {
    this.renderBox(context, fRect.viewInfo, fRect.f.f1,  fRect.t, fRect.rect.h, fRect.f);
    this.renderBox(context, fRect.viewInfo, fRect.f.f2,  fRect.t, fRect.rect.h, fRect.f);
},

renderConnector( context, fRect ) {
    // connector
    var connectorColor = this.getStyle( fRect.f, 'connectorColor' );
    if( connectorColor ) {
        context.fillStyle = connectorColor;
        var connectorThickness = this.getStyle( fRect.f, 'connectorThickness' );
        context.fillRect(
            fRect.rect.l, // left
            Math.round(fRect.rect.t+(fRect.rect.h-connectorThickness)/2), // top
            fRect.rect.w, // width
            connectorThickness
        );
    }
},

_defaultConfig() {
    return this._mergeConfigs(
        dojo.clone( this.inherited(arguments) ),
        {
            //maxFeatureScreenDensity: 400
            style: {
                connectorColor: '#333',
                connectorThickness: 1,

                color: function( feature, path, glyph, track ) {
                  var strand = feature.get('strand');
                  if(Math.abs(strand) != 1 && strand != '+' && strand != '-')
                    return track.colorForBase('reference');
                  else if(track.config.useXS) {
                    var xs = feature._get('xs')
                    var strand={'-':'color_rev_strand','+':'color_fwd_strand'}[xs];
                    if(!strand) strand='color_nostrand';
                    return glyph.getStyle( feature, strand );
                  }
                  else if(feature.get('multi_segment_template')) {
                    var revflag=feature.get('multi_segment_first');
                    if(feature.get('multi_segment_all_correctly_aligned')) {
                      if(revflag||!track.config.useReverseTemplate){
                        return strand == 1 || strand == '+'
                              ? glyph.getStyle( feature, 'color_fwd_strand' )
                              : glyph.getStyle( feature, 'color_rev_strand' );
                      }else {
                        return strand == 1 || strand == '+'
                              ? glyph.getStyle( feature, 'color_rev_strand' )
                              : glyph.getStyle( feature, 'color_fwd_strand' );
                      }
                    }
                    if(feature.get('multi_segment_next_segment_unmapped')) {
                      if(revflag||!track.config.useReverseTemplate){
                        return strand == 1 || strand == '+'
                              ? glyph.getStyle( feature, 'color_fwd_missing_mate' )
                              : glyph.getStyle( feature, 'color_rev_missing_mate' );
                      }else{
                        return strand == 1 || strand == '+'
                              ? glyph.getStyle( feature, 'color_rev_missing_mate' )
                              : glyph.getStyle( feature, 'color_fwd_missing_mate' );
                      }
                    }
                    if(feature.get('seq_id') == feature.get('next_seq_id')) {
                      if(revflag||!track.config.useReverseTemplate){
                        return strand == 1 || strand == '+'
                              ? glyph.getStyle( feature, 'color_fwd_strand_not_proper' )
                              : glyph.getStyle( feature, 'color_rev_strand_not_proper' );
                      }else{
                        return strand == 1 || strand == '+'
                              ? glyph.getStyle( feature, 'color_rev_strand_not_proper' )
                              : glyph.getStyle( feature, 'color_fwd_strand_not_proper' );
                      }
                    }
                    // should only leave aberrant chr
                    return strand == 1 || strand == '+'
                            ? glyph.getStyle( feature, 'color_fwd_diff_chr' )
                            : glyph.getStyle( feature, 'color_rev_diff_chr' );
                  }
                  return strand == 1 || strand == '+'
                          ? glyph.getStyle( feature, 'color_fwd_strand' )
                          : glyph.getStyle( feature, 'color_rev_strand' );
                },
                color_fwd_strand_not_proper: '#ECC8C8',
                color_rev_strand_not_proper: '#BEBED8',
                color_fwd_strand: '#EC8B8B',
                color_rev_strand: '#8F8FD8',
                color_fwd_missing_mate: '#D11919',
                color_rev_missing_mate: '#1919D1',
                color_fwd_diff_chr: '#000000',
                color_rev_diff_chr: '#969696',
                color_nostrand: '#999999',
                border_color: null,

                strandArrow: false,

                height: 7,
                marginBottom: 1,
                showMismatches: true,
                mismatchFont: 'bold 10px Courier New,monospace'
            }
        }
    );
},
layoutFeature(viewArgs, layout, feature) {
    var rect = this.inherited(arguments);
    if (!rect) {
        return rect;
    }
    if(this.config.readCloud) {
        if(feature.pairedFeature()) {
            var tlen = feature.f1.get('template_length')
            var t = Math.abs(tlen)

            // need to set the top of the inner rect
            rect.rect.t = t / (this.config.scaleFactor||1);
            rect.t = t / (this.config.scaleFactor||1);
        } else {
            rect.t = 0
            rect.rect.t = 0
        }
    }

    return rect;
},

_drawMismatches( context, fRect, feature, mismatches ) {
    var block = fRect.viewInfo.block;
    var scale = block.scale;

    var charSize = this.getCharacterMeasurements( context );
    context.textBaseline = 'middle'; // reset to alphabetic (the default) after loop

    array.forEach( mismatches, function( mismatch ) {
        var start = feature.get('start') + mismatch.start;
        var end = start + mismatch.length;

        var mRect = {
            h: (fRect.rect||{}).h || fRect.h,
            l: block.bpToX( start ),
            t: fRect.rect.t
        };
        mRect.w = Math.max( block.bpToX( end ) - mRect.l, 1 );

        if( mismatch.type == 'mismatch' || mismatch.type == 'deletion' ) {
            context.fillStyle = this.track.colorForBase( mismatch.type == 'deletion' ? 'deletion' : mismatch.base );
            context.fillRect( mRect.l, mRect.t, mRect.w, mRect.h );

            if( mRect.w >= charSize.w && mRect.h >= charSize.h-3 ) {
                context.font = this.config.style.mismatchFont;
                context.fillStyle = mismatch.type == 'deletion' ? 'white' : 'black';
                context.fillText( mismatch.base, mRect.l+(mRect.w-charSize.w)/2+1, mRect.t+mRect.h/2 );
            }
        }
        else if( mismatch.type == 'insertion' ) {
            context.fillStyle = 'purple';
            context.fillRect( mRect.l-1, mRect.t+1, 2, mRect.h-2 );
            context.fillRect( mRect.l-2, mRect.t, 4, 1 );
            context.fillRect( mRect.l-2, mRect.t+mRect.h-1, 4, 1 );
            if( mRect.w >= charSize.w && mRect.h >= charSize.h-3 ) {
                context.font = this.config.style.mismatchFont;
                context.fillText( '('+mismatch.base+')', mRect.l+2, mRect.t+mRect.h/2 );
            }
        }
        else if( mismatch.type == 'hardclip' || mismatch.type == 'softclip' ) {
            context.fillStyle = mismatch.type == 'hardclip' ? 'red' : 'blue';
            context.fillRect( mRect.l-1, mRect.t+1, 2, mRect.h-2 );
            context.fillRect( mRect.l-2, mRect.t, 4, 1 );
            context.fillRect( mRect.l-2, mRect.t+mRect.h-1, 4, 1 );
            if( mRect.w >= charSize.w && mRect.h >= charSize.h-3 ) {
                context.font = this.config.style.mismatchFont;
                context.fillText( '('+mismatch.base+')', mRect.l+2, mRect.t+mRect.h/2 );
            }
        }
        else if( mismatch.type == 'skip' ) {
            context.clearRect( mRect.l, mRect.t, mRect.w, mRect.h );
            context.fillStyle = '#333';
            context.fillRect( mRect.l, mRect.t+(mRect.h-2)/2, mRect.w, 2 );
        }
    },this);

    context.textBaseline = 'alphabetic';
},

getCharacterMeasurements: function( context ) {
    return this.charSize = this.charSize || function() {
        var fpx;

        try {
            fpx = (this.config.style.mismatchFont.match(/(\d+)px/i)||[])[1];
        } catch(e) {}

        fpx = fpx || Infinity;
        return { w: fpx, h: fpx };
    }.call(this);
}

});
});
